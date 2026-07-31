import { createId } from "./id.js";
import { findFreeSpot, separateFromOthers } from "./hotspots.js";
import { DEFAULT_HOTSPOTS, type RoomStyleId } from "./layout.js";
import {
  asCharacterId,
  asRoomId,
  type ActionKind,
  type CharacterId,
  type PresenceState,
  type Room,
  type RoomActionLogEntry,
  type RoomKind,
  type RoomMemberState,
  type Vec2,
} from "./types.js";

const DEFAULT_SPAWN: Vec2 = { x: 2, y: 1.8 };

export type CreateRoomInput = {
  kind: RoomKind;
  memberIds: CharacterId[];
  name?: string | null;
  now?: number;
  styleId?: RoomStyleId;
  adminIds?: CharacterId[];
};

function initialMemberState(
  characterId: CharacterId,
  index: number,
  now: number,
): RoomMemberState {
  return {
    characterId,
    presence: "sleeping",
    position: { x: DEFAULT_SPAWN.x + index * 2.2, y: DEFAULT_SPAWN.y + (index % 2) * 0.5 },
    facing: index % 2 === 0 ? "right" : "left",
    currentAction: "sleep",
    actionTargetId: null,
    occupiedSpotId: null,
    lastActiveAt: now,
  };
}

export function createRoom(input: CreateRoomInput): Room {
  if (input.kind === "dm" && input.memberIds.length !== 2) {
    throw new Error("dm rooms require exactly 2 members");
  }
  if (input.kind === "party" && input.memberIds.length < 3) {
    throw new Error("parties require at least 3 members");
  }

  const unique = new Set(input.memberIds.map(String));
  if (unique.size !== input.memberIds.length) {
    throw new Error("duplicate members are not allowed");
  }

  const now = input.now ?? Date.now();
  const memberState: Record<string, RoomMemberState> = {};
  input.memberIds.forEach((id, index) => {
    memberState[String(id)] = initialMemberState(id, index, now);
  });

  const adminIds =
    input.adminIds ??
    (input.kind === "party" && input.memberIds[0] ? [input.memberIds[0]] : []);

  return {
    id: asRoomId(createId("room")),
    kind: input.kind,
    name: input.name ?? null,
    memberIds: [...input.memberIds],
    adminIds,
    styleId: input.styleId ?? "garden",
    hotspots: DEFAULT_HOTSPOTS.map((h) => ({ ...h, position: { ...h.position } })),
    memberState,
    actionLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getMemberState(room: Room, characterId: CharacterId): RoomMemberState {
  const state = room.memberState[String(characterId)];
  if (!state) {
    throw new Error(`character ${characterId} is not in room ${room.id}`);
  }
  return state;
}

export function withMemberState(
  room: Room,
  characterId: CharacterId,
  patch: Partial<RoomMemberState>,
  now = Date.now(),
): Room {
  const current = getMemberState(room, characterId);
  return {
    ...room,
    updatedAt: now,
    memberState: {
      ...room.memberState,
      [String(characterId)]: {
        ...current,
        ...patch,
        characterId: asCharacterId(String(characterId)),
      },
    },
  };
}

export function listActiveMembers(room: Room): RoomMemberState[] {
  return Object.values(room.memberState).filter((m) => m.presence === "active");
}

export function isRoomAdmin(room: Room, characterId: CharacterId): boolean {
  return room.adminIds.some((id) => id === characterId);
}

export function setRoomStyle(
  room: Room,
  styleId: RoomStyleId,
  actorId: CharacterId,
  now = Date.now(),
): Room {
  if (room.kind === "party" && !isRoomAdmin(room, actorId)) {
    throw new Error("only party admins can change the shared room style");
  }
  return { ...room, styleId, updatedAt: now };
}

export function setPresence(
  room: Room,
  characterId: CharacterId,
  presence: PresenceState,
  now = Date.now(),
): Room {
  const current = getMemberState(room, characterId);

  if (presence === "sleeping") {
    // Sleep uses the same places as sit (couch, chair, floor, bed edge, table…).
    const alreadyOnSit =
      current.occupiedSpotId != null
        ? room.hotspots.find(
            (h) => h.id === current.occupiedSpotId && h.kind === "sit",
          )
        : undefined;

    const spot = alreadyOnSit ?? findFreeSpot(room, "sit", characterId);
    const pos = spot
      ? separateFromOthers(room, characterId, spot.position)
      : separateFromOthers(room, characterId, current.position);

    let next = withMemberState(
      room,
      characterId,
      {
        presence: "sleeping",
        currentAction: "sleep",
        actionTargetId: null,
        occupiedSpotId: spot?.id ?? null,
        position: pos,
        lastActiveAt: current.lastActiveAt,
      },
      now,
    );

    const logEntry: RoomActionLogEntry = {
      id: createId("log"),
      at: now,
      actorId: characterId,
      action: "sleep",
      targetId: null,
      source: "presence",
      spotId: spot?.id ?? null,
    };

    return {
      ...next,
      actionLog: [...next.actionLog, logEntry].slice(-100),
    };
  }

  // Waking / away: leave the sleep seat so others can use it.
  const action: ActionKind = presence === "active" ? "idle" : "idle";
  let next = withMemberState(
    room,
    characterId,
    {
      presence,
      currentAction: action,
      actionTargetId: null,
      occupiedSpotId: null,
      lastActiveAt: presence === "active" ? now : current.lastActiveAt,
    },
    now,
  );

  const logEntry: RoomActionLogEntry = {
    id: createId("log"),
    at: now,
    actorId: characterId,
    action,
    targetId: null,
    source: "presence",
  };

  next = {
    ...next,
    actionLog: [...next.actionLog, logEntry].slice(-100),
  };

  return next;
}
