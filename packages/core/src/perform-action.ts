import { isSocialAction } from "./actions.js";
import { createId } from "./id.js";
import { getMemberState, withMemberState } from "./room.js";
import type {
  ActionKind,
  Character,
  CharacterId,
  Room,
  RoomActionLogEntry,
} from "./types.js";

export type PerformActionResult = {
  room: Room;
  logEntry: RoomActionLogEntry;
};

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

function approachTarget(
  room: Room,
  actorId: CharacterId,
  targetId: CharacterId,
  now: number,
): Room {
  const target = getMemberState(room, targetId);
  return withMemberState(
    room,
    actorId,
    {
      position: {
        x: target.position.x + (target.facing === "left" ? 1 : -1),
        y: target.position.y,
      },
      facing: target.facing === "left" ? "right" : "left",
    },
    now,
  );
}

/**
 * Apply a player or auto action to the room.
 * Social actions require an active target in the same room.
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
  } = {},
): PerformActionResult {
  const now = options.now ?? Date.now();
  const source = options.source ?? "command";
  const actor = getMemberState(room, actorId);

  if (actor.presence !== "active" && source === "command") {
    throw new Error("only active members can run commands");
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
  if (targetId && isSocialAction(action)) {
    next = approachTarget(next, actorId, targetId, now);
  }

  next = withMemberState(
    next,
    actorId,
    {
      currentAction: action,
      actionTargetId: targetId,
      presence: "active",
      lastActiveAt: now,
    },
    now,
  );

  if (targetId && (action === "hug" || action === "kiss")) {
    next = withMemberState(
      next,
      targetId,
      {
        currentAction: action,
        actionTargetId: actorId,
      },
      now,
    );
  }

  const logEntry: RoomActionLogEntry = {
    id: createId("log"),
    at: now,
    actorId,
    action,
    targetId,
    source,
  };

  next = {
    ...next,
    actionLog: [...next.actionLog, logEntry].slice(-100),
    updatedAt: now,
  };

  return { room: next, logEntry };
}
