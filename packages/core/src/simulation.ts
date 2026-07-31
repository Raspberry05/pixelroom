import {
  AUTO_INTERACTIONS,
  canStartAction,
  isLocationAction,
} from "./actions.js";
import {
  areNearForConversation,
  findFreeSpotForAction,
  separateFromOthers,
} from "./hotspots.js";
import { performAction } from "./perform-action.js";
import { getMemberState, listActiveMembers, withMemberState } from "./room.js";
import type { ActionKind, CharacterId, Room, RoomActionLogEntry } from "./types.js";

export type SimulationConfig = {
  /** Chance (0–1) that active pairs auto-interact each tick. */
  autoInteractChance: number;
  /** Max auto interactions emitted per tick. */
  maxAutoInteractions: number;
  /** Characters that should not auto-wander this tick (e.g. player-scrolled). */
  skipWanderIds?: CharacterId[];
  /** Logical floor width (defaults to home chunk span). */
  floorMaxX?: number;
};

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  autoInteractChance: 0.35,
  maxAutoInteractions: 2,
};

export type TickResult = {
  room: Room;
  events: RoomActionLogEntry[];
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromRoom(room: Room, now: number): number {
  let hash = now >>> 0;
  for (const id of room.memberIds) {
    for (let i = 0; i < id.length; i += 1) {
      hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
    }
  }
  return hash >>> 0;
}

function wander(
  room: Room,
  characterId: CharacterId,
  rand: () => number,
  now: number,
  maxX?: number,
): Room {
  const member = room.memberState[String(characterId)];
  if (!member || member.presence !== "active") {
    return room;
  }
  // Stay put while occupying a hotspot action
  if (member.occupiedSpotId && isLocationAction(member.currentAction)) {
    return room;
  }
  if (member.currentAction !== "idle" && member.currentAction !== "walk") {
    return room;
  }

  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  const [dx, dy] = dirs[Math.floor(rand() * dirs.length)]!;
  const raw = {
    x: member.position.x + dx * 0.42,
    y: member.position.y + dy * 0.35,
  };
  const nextPos = separateFromOthers(room, characterId, raw, 0.85, maxX);
  const moved =
    Math.abs(nextPos.x - member.position.x) > 0.01 ||
    Math.abs(nextPos.y - member.position.y) > 0.01;
  if (!moved) {
    return room;
  }
  return withMemberState(
    room,
    characterId,
    {
      position: nextPos,
      facing:
        Math.abs(nextPos.x - member.position.x) > 0.05
          ? nextPos.x < member.position.x
            ? "left"
            : "right"
          : member.facing,
      currentAction: "walk",
      actionTargetId: null,
      occupiedSpotId: null,
    },
    now,
  );
}

function pickNearPair(
  room: Room,
  activeIds: CharacterId[],
  rand: () => number,
): [CharacterId, CharacterId] | null {
  if (activeIds.length < 2) {
    return null;
  }
  const nearPairs: Array<[CharacterId, CharacterId]> = [];
  for (let i = 0; i < activeIds.length; i += 1) {
    const aId = activeIds[i]!;
    const a = getMemberState(room, aId);
    for (let j = i + 1; j < activeIds.length; j += 1) {
      const bId = activeIds[j]!;
      const b = getMemberState(room, bId);
      if (areNearForConversation(a, b)) {
        nearPairs.push([aId, bId]);
      }
    }
  }
  if (nearPairs.length === 0) {
    return null;
  }
  const pair = nearPairs[Math.floor(rand() * nearPairs.length)];
  if (!pair) return null;
  // Randomize who initiates.
  return rand() < 0.5 ? pair : [pair[1], pair[0]];
}

function eligibleForAction(
  room: Room,
  actorId: CharacterId,
  action: ActionKind,
  now: number,
): boolean {
  const member = getMemberState(room, actorId);
  if (member.presence !== "active") return false;
  return canStartAction(member, action, room.actionLog, now);
}

/**
 * Advance room simulation one tick.
 * Auto: wave / talk / sit / sing (not hug / kiss / dance).
 * Sit uses free seats; positions never stack.
 * Social auto-actions only when characters already share nearby space.
 * Skips already-active actions and respects per-action cooldowns.
 */
export function tickRoom(
  room: Room,
  options: {
    now?: number;
    config?: Partial<SimulationConfig>;
    random?: () => number;
  } = {},
): TickResult {
  const now = options.now ?? Date.now();
  const config: SimulationConfig = {
    ...DEFAULT_SIM_CONFIG,
    ...options.config,
  };
  const rand = options.random ?? mulberry32(seedFromRoom(room, now));
  const events: RoomActionLogEntry[] = [];

  let next = room;
  const active = listActiveMembers(next);
  const skipWander = new Set((config.skipWanderIds ?? []).map(String));

  for (const member of active) {
    if (skipWander.has(String(member.characterId))) continue;
    next = wander(next, member.characterId, rand, now, config.floorMaxX);
  }

  const activeIds = listActiveMembers(next).map((m) => m.characterId);
  let interactions = 0;
  let attempts = 0;
  const maxAttempts = Math.max(4, config.maxAutoInteractions * 6);

  while (
    interactions < config.maxAutoInteractions &&
    attempts < maxAttempts &&
    activeIds.length >= 1 &&
    rand() < config.autoInteractChance
  ) {
    attempts += 1;
    const action = AUTO_INTERACTIONS[
      Math.floor(rand() * AUTO_INTERACTIONS.length)
    ] as ActionKind;

    try {
      if (action === "sit" || action === "sing") {
        const candidates = activeIds.filter((id) =>
          eligibleForAction(next, id, action, now),
        );
        if (candidates.length === 0) continue;
        const actorId = candidates[Math.floor(rand() * candidates.length)];
        if (!actorId) continue;
        if (action === "sit" && !findFreeSpotForAction(next, "sit", actorId)) {
          continue;
        }
        const result = performAction(next, actorId, action, {
          source: "auto",
          now,
        });
        next = result.room;
        events.push(result.logEntry);
      } else {
        const pair = pickNearPair(next, activeIds, rand);
        if (!pair) continue;
        if (!eligibleForAction(next, pair[0], action, now)) continue;
        const result = performAction(next, pair[0], action, {
          targetId: pair[1],
          source: "auto",
          now,
        });
        next = result.room;
        events.push(result.logEntry);
      }
      interactions += 1;
    } catch {
      // skip failed auto attempts (no seat, cooldown, already doing it, etc.)
    }
  }

  return { room: next, events };
}
