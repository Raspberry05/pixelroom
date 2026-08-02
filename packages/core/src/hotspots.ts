import { hotspotKindForAction, type HotspotKind } from "./actions.js";
import {
  FLOOR_DEPTH,
  ROOM_SPAN_X,
  type RoomHotspot,
  type SolidBox,
} from "./layout.js";
import type { ActionKind, CharacterId, Room, RoomMemberState, Vec2 } from "./types.js";

export function listOccupantsOfSpot(room: Room, spotId: string): CharacterId[] {
  return Object.values(room.memberState)
    .filter((m) => m.occupiedSpotId === spotId)
    .map((m) => m.characterId);
}

export function isSpotFree(
  room: Room,
  spot: RoomHotspot,
  exceptCharacterId?: CharacterId,
): boolean {
  const occupants = listOccupantsOfSpot(room, spot.id).filter(
    (id) => id !== exceptCharacterId,
  );
  return occupants.length < spot.capacity;
}

export function findFreeSpot(
  room: Room,
  kind: HotspotKind,
  actorId: CharacterId,
): RoomHotspot | null {
  const actor = room.memberState[String(actorId)];
  const free = room.hotspots.filter(
    (h) => h.kind === kind && isSpotFree(room, h, actorId),
  );
  if (free.length === 0) return null;

  // Sit: walk to the nearest free seat (furniture seats are listed first in
  // hotspots; distance break ties toward whatever is closest to the actor).
  if (kind === "sit" && actor) {
    free.sort((a, b) => {
      const aFloor = a.id.startsWith("floor_") ? 1 : 0;
      const bFloor = b.id.startsWith("floor_") ? 1 : 0;
      if (aFloor !== bFloor) return aFloor - bFloor;
      const da = Math.hypot(
        a.position.x - actor.position.x,
        a.position.y - actor.position.y,
      );
      const db = Math.hypot(
        b.position.x - actor.position.x,
        b.position.y - actor.position.y,
      );
      return da - db;
    });
  }

  return free[0] ?? null;
}

export function findFreeSpotForAction(
  room: Room,
  action: ActionKind,
  actorId: CharacterId,
): RoomHotspot | null {
  const kind = hotspotKindForAction(action);
  if (!kind) return null;
  return findFreeSpot(room, kind, actorId);
}

export function clampToFloor(pos: Vec2, maxX: number = ROOM_SPAN_X): Vec2 {
  return {
    x: Math.max(0, Math.min(maxX, pos.x)),
    y: Math.max(0, Math.min(FLOOR_DEPTH, pos.y)),
  };
}

/**
 * World-space range for auto social actions (talk/wave once already nearby).
 * Closing the gap is per-client based on who is visible on that device —
 * phones and iPads show different amounts of the room, so visibility ≠ this constant.
 */
export const CONVERSE_RANGE = 3.4;

export function areNearForConversation(
  a: { position: Vec2 },
  b: { position: Vec2 },
  maxDist: number = CONVERSE_RANGE,
): boolean {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) <= maxDist;
}

/**
 * Nudge a desired floor position away from other members so sprites never stack.
 * Works in 2D (along the room and into depth).
 */
/**
 * Slide a desired position out of solid furniture AABBs (tables, appliances…).
 * Characters walk around obstacles instead of through them.
 */
export function resolveWalkPosition(
  desired: Vec2,
  solids: SolidBox[],
  maxX: number = ROOM_SPAN_X,
  radius = 0.38,
): Vec2 {
  let { x, y } = clampToFloor(desired, maxX);
  if (solids.length === 0) return { x, y };

  for (let pass = 0; pass < 8; pass += 1) {
    let bumped = false;
    for (const s of solids) {
      const nearestX = Math.max(s.minX, Math.min(s.maxX, x));
      const nearestY = Math.max(s.minY, Math.min(s.maxY, y));
      const dx = x - nearestX;
      const dy = y - nearestY;
      const dist = Math.hypot(dx, dy);
      if (dist >= radius) continue;
      bumped = true;
      if (dist < 1e-5) {
        const left = Math.abs(x - s.minX);
        const right = Math.abs(s.maxX - x);
        const up = Math.abs(y - s.minY);
        const down = Math.abs(s.maxY - y);
        const m = Math.min(left, right, up, down);
        if (m === left) x = s.minX - radius;
        else if (m === right) x = s.maxX + radius;
        else if (m === up) y = s.minY - radius;
        else y = s.maxY + radius;
      } else {
        const push = (radius - dist) / dist;
        x += dx * push;
        y += dy * push;
      }
    }
    ({ x, y } = clampToFloor({ x, y }, maxX));
    if (!bumped) break;
  }
  return { x, y };
}

export function separateFromOthers(
  room: Room,
  actorId: CharacterId,
  desired: Vec2,
  minGap = 0.85,
  maxX: number = ROOM_SPAN_X,
  solids: SolidBox[] = [],
): Vec2 {
  const awayFromSolids = resolveWalkPosition(desired, solids, maxX);
  const others = Object.values(room.memberState).filter(
    (m) => m.characterId !== actorId && m.presence !== "sleeping",
  );
  let { x, y } = awayFromSolids;
  for (let pass = 0; pass < 8; pass += 1) {
    let bumped = false;
    for (const other of others) {
      const dx = x - other.position.x;
      const dy = y - other.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minGap) {
        if (dist < 1e-6) {
          x += minGap;
        } else {
          const push = (minGap - dist) / dist;
          x += dx * push;
          y += dy * push;
        }
        bumped = true;
      }
    }
    if (!bumped) break;
  }
  return resolveWalkPosition({ x, y }, solids, maxX);
}

export function faceToward(
  actor: RoomMemberState,
  other: RoomMemberState,
): "left" | "right" {
  return other.position.x < actor.position.x ? "left" : "right";
}

export function clearSpotOccupation(
  member: RoomMemberState,
): Pick<RoomMemberState, "occupiedSpotId"> {
  return { occupiedSpotId: null };
}
