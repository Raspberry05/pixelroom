import {
  ACTION_COOLDOWN_MS,
  canStartAction,
  isActionHeld,
  isLocationAction,
  isPromptOnlyAction,
  isSocialAction,
  recentlyPlayerCommanded,
} from "./actions.js";
import { faceToward, findFreeSpotForAction, separateFromOthers, areNearForConversation } from "./hotspots.js";
import { createId } from "./id.js";
import type { SeatFacing, SolidBox } from "./layout.js";
import { getMemberState, withMemberState } from "./room.js";
import type {
  ActionKind,
  Character,
  CharacterId,
  Room,
  RoomActionLogEntry,
  RoomMemberState,
} from "./types.js";

export type PerformActionResult = {
  room: Room;
  logEntry: RoomActionLogEntry;
};

/** Map seat facing onto character L/R (sprites only flip horizontally). */
function memberFacingFromSeat(
  seatFacing: SeatFacing | undefined,
  fallback: RoomMemberState["facing"],
): RoomMemberState["facing"] {
  if (seatFacing === "left" || seatFacing === "right") return seatFacing;
  return fallback;
}

function resolveTargetId(
  room: Room,
  charactersById: Map<CharacterId, Character>,
  actorId: CharacterId,
  targetName: string | null,
): CharacterId | null {
  if (!targetName) {
    return null;
  }

  const needle = targetName.toLowerCase();
  for (const memberId of room.memberIds) {
    if (memberId === actorId) continue;
    const character = charactersById.get(memberId);
    if (character && character.displayName.toLowerCase() === needle) {
      return memberId;
    }
  }

  throw new Error(`no room member named "${targetName}"`);
}

/**
 * Apply a player or auto action to the room.
 * Location actions claim a free hotspot and walk there.
 * Social actions face each other and avoid overlapping positions.
 */
export function performAction(
  room: Room,
  actorId: CharacterId,
  action: ActionKind,
  options: {
    targetName?: string | null;
    targetId?: CharacterId | null;
    charactersById?: Map<CharacterId, Character>;
    source?: RoomActionLogEntry["source"];
    now?: number;
    /** Solid furniture — walk/sit targets slide around these. */
    solidBoxes?: SolidBox[];
  } = {},
): PerformActionResult {
  const now = options.now ?? Date.now();
  const source = options.source ?? "command";
  const solids = options.solidBoxes ?? [];
  const actor = getMemberState(room, actorId);

  if (actor.presence !== "active" && source === "command") {
    throw new Error("only active members can run commands");
  }

  if (source === "auto" && isPromptOnlyAction(action)) {
    throw new Error(`${action} cannot be auto-played — prompt it yourself`);
  }

  // Already sitting / cooking / waving / etc. — don't re-issue the same action.
  if (actor.currentAction === action) {
    throw new Error(`already ${action}`);
  }

  // Auto must obey player commands and finish held actions before switching.
  if (source === "auto") {
    if (recentlyPlayerCommanded(room.actionLog, String(actorId), now)) {
      throw new Error("obeying player command");
    }
    if (isActionHeld(actor, room.actionLog, now)) {
      throw new Error(`still ${actor.currentAction}`);
    }
    if (
      ACTION_COOLDOWN_MS[action] > 0 &&
      !canStartAction(actor, action, room.actionLog, now)
    ) {
      throw new Error(`${action} is on cooldown`);
    }
  }

  let targetId =
    options.targetId ??
    (options.targetName
      ? resolveTargetId(
          room,
          options.charactersById ?? new Map(),
          actorId,
          options.targetName,
        )
      : null);

  if (isSocialAction(action) && !targetId) {
    throw new Error(`${action} requires a target`);
  }

  if (targetId) {
    const target = getMemberState(room, targetId);
    if (target.presence === "sleeping" && isSocialAction(action)) {
      throw new Error(`cannot ${action} a sleeping member`);
    }
  }

  let next = room;
  let spotId: string | null = null;

  if (isLocationAction(action)) {
    const spot = findFreeSpotForAction(next, action, actorId);
    if (!spot) {
      // Sit: if no chair/floor hotspot is free, just sit where you are.
      if (action === "sit") {
        const pos = separateFromOthers(
          next,
          actorId,
          actor.position,
          0.85,
          undefined,
          solids,
        );
        next = withMemberState(
          next,
          actorId,
          {
            position: pos,
            currentAction: "sit",
            occupiedSpotId: null,
            actionTargetId: null,
            presence: "active",
            lastActiveAt: now,
          },
          now,
        );
      } else {
        throw new Error(`no free ${action} spot in this room`);
      }
    } else {
      spotId = spot.id;
      const pos = separateFromOthers(
        next,
        actorId,
        spot.position,
        0.85,
        undefined,
        solids,
      );
      next = withMemberState(
        next,
        actorId,
        {
          position: pos,
          currentAction: "walk",
          occupiedSpotId: null,
          actionTargetId: null,
        },
        now,
      );
      next = withMemberState(
        next,
        actorId,
        {
          position: pos,
          currentAction: action,
          occupiedSpotId: spot.id,
          actionTargetId: null,
          presence: "active",
          lastActiveAt: now,
          ...(action === "sit"
            ? {
                facing: memberFacingFromSeat(spot.facing, actor.facing),
              }
            : {}),
        },
        now,
      );
    }
  } else {
    if (targetId && isSocialAction(action)) {
      const target = getMemberState(next, targetId);
      // Far-apart characters keep their own scroll/camera positions —
      // never rush across the room just to socialize.
      if (areNearForConversation(actor, target)) {
        // Face only — never teleport/approach on the server. Closing the gap
        // is per-client: each device walks its own character toward peers that
        // are actually visible on that screen (phone vs iPad viewports differ).
        next = withMemberState(
          next,
          actorId,
          { facing: faceToward(actor, target) },
          now,
        );
        next = withMemberState(
          next,
          targetId,
          { facing: faceToward(target, actor) },
          now,
        );
      } else if (source === "auto") {
        throw new Error("targets too far apart for auto social");
      }
    } else if (!isSocialAction(action)) {
      // dance / sing / watch in place but nudged off others
      const pos = separateFromOthers(
        next,
        actorId,
        actor.position,
        0.85,
        undefined,
        solids,
      );
      next = withMemberState(
        next,
        actorId,
        {
          position: pos,
          occupiedSpotId: null,
        },
        now,
      );
    }

    next = withMemberState(
      next,
      actorId,
      {
        currentAction: action,
        actionTargetId: targetId,
        presence: "active",
        lastActiveAt: now,
        occupiedSpotId: isLocationAction(action) ? spotId : null,
      },
      now,
    );

    if (targetId && (action === "hug" || action === "kiss" || action === "talk" || action === "wave")) {
      const a = getMemberState(next, actorId);
      const b = getMemberState(next, targetId);
      next = withMemberState(
        next,
        targetId,
        {
          facing: faceToward(b, a),
          ...(action === "hug" || action === "kiss"
            ? { currentAction: action, actionTargetId: actorId, occupiedSpotId: null }
            : {}),
        },
        now,
      );
      next = withMemberState(
        next,
        actorId,
        { facing: faceToward(a, b) },
        now,
      );
    }
  }

  const logEntry: RoomActionLogEntry = {
    id: createId("log"),
    at: now,
    actorId,
    action,
    targetId,
    source,
    spotId,
  };

  next = {
    ...next,
    actionLog: [...next.actionLog, logEntry].slice(-100),
    updatedAt: now,
  };

  return { room: next, logEntry };
}
