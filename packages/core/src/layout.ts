import type { HotspotKind } from "./actions.js";
import type { Vec2 } from "./types.js";

/** Logical X span of the home room (matches CHUNK_CELLS on mobile). */
export const ROOM_SPAN_X = 12;
/** Logical floor depth: 0 = front of stage, higher = toward the wall. */
export const FLOOR_DEPTH = 4;

export type SeatFacing = "left" | "right" | "up" | "down";

export type RoomHotspot = {
  id: string;
  kind: HotspotKind;
  /** Logical position on the floor plane (x along room, y = depth). */
  position: Vec2;
  /** How many characters may occupy this spot at once. */
  capacity: number;
  label: string;
  /** Preferred facing while occupying this seat (sit spots). */
  facing?: SeatFacing;
};

export type RoomStyleId = "cozy" | "loft" | "garden" | "studio";

export type RoomStyle = {
  id: RoomStyleId;
  name: string;
  wallTop: string;
  wallBottom: string;
  floor: string;
  accent: string;
};

export const ROOM_STYLES: Record<RoomStyleId, RoomStyle> = {
  cozy: {
    id: "cozy",
    name: "Cozy Den",
    wallTop: "#e8dfd2",
    wallBottom: "#d4c4ae",
    floor: "#9a8568",
    accent: "#6b5344",
  },
  loft: {
    id: "loft",
    name: "Loft Studio",
    wallTop: "#d9dde3",
    wallBottom: "#c0c6cf",
    floor: "#8a9099",
    accent: "#5c6570",
  },
  garden: {
    id: "garden",
    name: "Garden Nook",
    wallTop: "#dfe8d9",
    wallBottom: "#c5d4c0",
    floor: "#9aaf8e",
    accent: "#4a6741",
  },
  studio: {
    id: "studio",
    name: "Pixel Studio",
    wallTop: "#e4ebe4",
    wallBottom: "#d5dfd5",
    floor: "#8da282",
    accent: "#2f6f55",
  },
};

/**
 * Sprites that grant a sit hotspot when placed (unpacked) in the room layout.
 * Sync merges these into room.hotspots; characters walk to the nearest free seat.
 */
export const SEAT_SPRITES = new Set<string>([
  "chairDown",
  "chairLeft",
  "chairRight",
  "chairUp",
]);

/** Floor furniture characters cannot walk through. */
export const SOLID_SPRITES = new Set<string>([
  "table",
  "sideTable",
  "bed",
  "nightstand",
  "appliance",
  "tv",
]);

/** Approximate footprint width in cells for walk collision. */
const SOLID_WIDTH: Record<string, number> = {
  table: 2,
  sideTable: 1,
  bed: 2,
  nightstand: 1,
  appliance: 1.2,
  tv: 1.2,
};

export type SolidBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** Build logical-floor solid AABBs from placed furniture. */
export function solidBoxesFromFurniture(
  furniture: LayoutFurnitureRef[],
  floorDepthCells = 7,
): SolidBox[] {
  const boxes: SolidBox[] = [];
  for (const piece of furniture) {
    if (piece.packed) continue;
    if (!SOLID_SPRITES.has(piece.sprite)) continue;
    const w = SOLID_WIDTH[piece.sprite] ?? 1;
    const minY = (piece.gy / Math.max(1, floorDepthCells)) * FLOOR_DEPTH;
    const maxY = Math.min(FLOOR_DEPTH, minY + 0.65);
    boxes.push({
      minX: piece.gx,
      maxX: piece.gx + w,
      minY,
      maxY,
    });
  }
  return boxes;
}

/** Default cook / clean / floor-sit stations. Chair seats come from placed furniture. */
export const DEFAULT_HOTSPOTS: RoomHotspot[] = [
  { id: "floor_1", kind: "sit", position: { x: 2, y: 0.8 }, capacity: 1, label: "Floor" },
  { id: "floor_2", kind: "sit", position: { x: 3.2, y: 1.8 }, capacity: 1, label: "Floor" },
  { id: "cook_1", kind: "cook", position: { x: 11, y: 1.2 }, capacity: 1, label: "Stove" },
  { id: "cook_2", kind: "cook", position: { x: 11.8, y: 2.0 }, capacity: 1, label: "Counter" },
  { id: "clean_1", kind: "clean", position: { x: 0.5, y: 1.0 }, capacity: 1, label: "Sink" },
];

export type LayoutFurnitureRef = {
  id: string;
  sprite: string;
  gx: number;
  gy: number;
  packed?: boolean;
};

/** Grid offset from furniture origin for a sit hotspot (DevTools / layout). */
export type SeatOffset = { x: number; y: number; facing?: SeatFacing };

/**
 * Merge placed chair furniture into hotspots. Furniture seats are listed before
 * floor sits so finders prefer real chairs; cook/clean spots are preserved.
 * When `seatOffsetsBySprite` provides offsets for a sprite, those seats are used
 * (even if the sprite is not in SEAT_SPRITES).
 */
export function hotspotsWithFurnitureSeats(
  base: RoomHotspot[],
  furniture: LayoutFurnitureRef[],
  floorDepthCells = 7,
  seatOffsetsBySprite?: Record<string, SeatOffset[]>,
): RoomHotspot[] {
  const nonSit = base.filter((h) => h.kind !== "sit");
  const floorSits = base.filter(
    (h) => h.kind === "sit" && h.id.startsWith("floor_"),
  );
  const seats: RoomHotspot[] = [];
  for (const piece of furniture) {
    if (piece.packed) continue;
    const offsets = seatOffsetsBySprite?.[piece.sprite];
    const useOffsets = offsets && offsets.length > 0;
    if (!useOffsets && !SEAT_SPRITES.has(piece.sprite)) continue;

    const spots: SeatOffset[] = useOffsets
      ? offsets
      : [{ x: 0, y: 0 }];

    spots.forEach((off, index) => {
      const depthT = (piece.gy + off.y) / Math.max(1, floorDepthCells);
      const y = Math.min(
        FLOOR_DEPTH,
        Math.max(0.2, depthT * FLOOR_DEPTH + 0.35),
      );
      seats.push({
        id: spots.length > 1 ? `seat_${piece.id}_${index}` : `seat_${piece.id}`,
        kind: "sit",
        position: { x: piece.gx + off.x + 0.5, y },
        capacity: 1,
        label: "Chair",
        ...(off.facing ? { facing: off.facing } : {}),
      });
    });
  }
  return [...nonSit, ...seats, ...floorSits];
}

export function isRoomStyleId(value: string): value is RoomStyleId {
  return value in ROOM_STYLES;
}
