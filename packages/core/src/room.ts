import { createId } from "./id.js";
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

const DEFAULT_SPAWN: Vec2 = { x: 2, y: 2 };

export type CreateRoomInput = {
  kind: RoomKind;
  memberIds: CharacterId[];
  name?: string | null;
  now?: number;
};

function initialMemberState(
  characterId: CharacterId,
  index: number,
  now: number,
): RoomMemberState {
  return {
    characterId,
    presence: "sleeping",
    position: { x: DEFAULT_SPAWN.x + index * 2, y: DEFAULT_SPAWN.y },
    facing: index % 2 === 0 ? "right" : "left",
    currentAction: "sleep",
    actionTargetId: null,
    lastActiveAt: now,
  };
}

export function createRoom(input: CreateRoomInput): Room {
  if (input.kind === "dm" && input.memberIds.length !== 2) {
    throw new Error("dm rooms require exactly 2 members");
  }
  if (input.kind === "group" && input.memberIds.length < 2) {
    throw new Error("group rooms require at least 2 members");
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

  return {
    id: asRoomId(createId("room")),
    kind: input.kind,
    name: input.name ?? null,
    memberIds: [...input.memberIds],
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

export function setPresence(
  room: Room,
  characterId: CharacterId,
  presence: PresenceState,
  now = Date.now(),
): Room {
  const action: ActionKind = presence === "sleeping" ? "sleep" : "idle";

  let next = withMemberState(
    room,
    characterId,
    {
      presence,
      currentAction: action,
      actionTargetId: null,
      lastActiveAt: presence === "active" ? now : getMemberState(room, characterId).lastActiveAt,
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
