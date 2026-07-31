import { hotspotKindForAction, type HotspotKind } from "./actions.js";
import { FLOOR_DEPTH, ROOM_SPAN_X, type RoomHotspot } from "./layout.js";
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
  const spots = room.hotspots.filter((h) => h.kind === kind);
  for (const spot of spots) {
    if (isSpotFree(room, spot, actorId)) {
      return spot;
    }
  }
  return null;
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
 * Same-screen conversation range. Social meet-ups (approach / auto talk)
 * only happen when characters are already this close — never across the room.
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
export function separateFromOthers(
  room: Room,
  actorId: CharacterId,
  desired: Vec2,
  minGap = 0.85,
  maxX: number = ROOM_SPAN_X,
): Vec2 {
  const others = Object.values(room.memberState).filter(
    (m) => m.characterId !== actorId && m.presence !== "sleeping",
  );
  let { x, y } = desired;
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
  return clampToFloor({ x, y }, maxX);
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
