import type { HotspotKind } from "./actions.js";
import type { Vec2 } from "./types.js";

/** Logical X span of the home room (matches CHUNK_CELLS on mobile). */
export const ROOM_SPAN_X = 12;
/** Logical floor depth: 0 = front of stage, higher = toward the wall. */
export const FLOOR_DEPTH = 4;

export type RoomHotspot = {
  id: string;
  kind: HotspotKind;
  /** Logical position on the floor plane (x along room, y = depth). */
  position: Vec2;
  /** How many characters may occupy this spot at once. */
  capacity: number;
  label: string;
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

/** Default sit / cook / clean stations on the floor plane (x + depth y).
 *  Sit spots are also used when a character goes to sleep (disconnect / leave).
 */
export const DEFAULT_HOTSPOTS: RoomHotspot[] = [
  { id: "couch_l", kind: "sit", position: { x: 4, y: 2.2 }, capacity: 1, label: "Couch L" },
  { id: "couch_m", kind: "sit", position: { x: 5.5, y: 2.2 }, capacity: 1, label: "Couch M" },
  { id: "couch_r", kind: "sit", position: { x: 7, y: 2.2 }, capacity: 1, label: "Couch R" },
  { id: "chair_a", kind: "sit", position: { x: 9, y: 1.4 }, capacity: 1, label: "Chair" },
  { id: "chair_b", kind: "sit", position: { x: 10.5, y: 1.6 }, capacity: 1, label: "Chair" },
  { id: "floor_1", kind: "sit", position: { x: 2, y: 0.8 }, capacity: 1, label: "Floor" },
  { id: "floor_2", kind: "sit", position: { x: 3.2, y: 1.8 }, capacity: 1, label: "Floor" },
  { id: "bed_edge", kind: "sit", position: { x: 1.2, y: 3.2 }, capacity: 1, label: "Bed" },
  { id: "table_edge", kind: "sit", position: { x: 8.2, y: 2.6 }, capacity: 1, label: "Table" },
  { id: "cook_1", kind: "cook", position: { x: 11, y: 1.2 }, capacity: 1, label: "Stove" },
  { id: "cook_2", kind: "cook", position: { x: 11.8, y: 2.0 }, capacity: 1, label: "Counter" },
  { id: "clean_1", kind: "clean", position: { x: 0.5, y: 1.0 }, capacity: 1, label: "Sink" },
];

export function isRoomStyleId(value: string): value is RoomStyleId {
  return value in ROOM_STYLES;
}
