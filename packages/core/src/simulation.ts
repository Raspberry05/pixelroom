import { AUTO_INTERACTIONS } from "./actions.js";
import { performAction } from "./perform-action.js";
import { listActiveMembers, withMemberState } from "./room.js";
import type { ActionKind, CharacterId, Room, RoomActionLogEntry } from "./types.js";

export type SimulationConfig = {
  /** Chance (0–1) that active pairs auto-interact each tick. */
  autoInteractChance: number;
  /** Max auto interactions emitted per tick. */
  maxAutoInteractions: number;
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
): Room {
  const member = room.memberState[String(characterId)];
  if (!member || member.presence !== "active") {
    return room;
  }
  if (member.currentAction !== "idle" && member.currentAction !== "walk") {
    return room;
  }

  const dx = rand() < 0.5 ? -1 : 1;
  const nextX = Math.max(0, Math.min(12, member.position.x + dx));
  return withMemberState(
    room,
    characterId,
    {
      position: { x: nextX, y: member.position.y },
      facing: dx < 0 ? "left" : "right",
      currentAction: "walk",
      actionTargetId: null,
    },
    now,
  );
}

function pickPair(
  activeIds: CharacterId[],
  rand: () => number,
): [CharacterId, CharacterId] | null {
  if (activeIds.length < 2) {
    return null;
  }
  const aIndex = Math.floor(rand() * activeIds.length);
  let bIndex = Math.floor(rand() * activeIds.length);
  if (bIndex === aIndex) {
    bIndex = (bIndex + 1) % activeIds.length;
  }
  const a = activeIds[aIndex];
  const b = activeIds[bIndex];
  if (!a || !b) {
    return null;
  }
  return [a, b];
}

/**
 * Advance room simulation one tick.
 * - Active members may wander
 * - Pairs of active members may auto-interact (Sims-lite)
 * - Sleeping members stay asleep until presence updates
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

  for (const member of active) {
    next = wander(next, member.characterId, rand, now);
  }

  const activeIds = listActiveMembers(next).map((m) => m.characterId);
  let interactions = 0;

  while (
    interactions < config.maxAutoInteractions &&
    activeIds.length >= 2 &&
    rand() < config.autoInteractChance
  ) {
    const pair = pickPair(activeIds, rand);
    if (!pair) break;

    const action = AUTO_INTERACTIONS[
      Math.floor(rand() * AUTO_INTERACTIONS.length)
    ] as ActionKind;

    const result = performAction(next, pair[0], action, {
      targetId: pair[1],
      source: "auto",
      now,
    });
    next = result.room;
    events.push(result.logEntry);
    interactions += 1;
  }

  return { room: next, events };
}
