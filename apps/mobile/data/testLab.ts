import { asRoomId, type RoomId } from "@pixelroom/core";
import type { RoomCleanlinessState } from "./minigames";
import {
  createDefaultRoomDocument,
  type PlacedFurniture,
  type RoomDocument,
} from "./roomLayout";

/** Local sandbox room for dirt, cleaning, and furniture-action QA. */
export const TEST_LAB_ROOM_ID = asRoomId("dm:local:test-lab");

export function isTestLabRoom(roomId: RoomId | string): boolean {
  return String(roomId) === String(TEST_LAB_ROOM_ID);
}

/**
 * Fully furnished layout so every furniture-gated action / tap minigame is available:
 * cook, fry (via appliance), sit, watch, sleep/bedmaking, plant watering, clean (via dirt).
 */
export function createTestLabRoomDocument(): RoomDocument {
  const furniture: PlacedFurniture[] = [
    { id: "lab_bed", sprite: "bed", gx: 0, gy: 0, anchor: "floor" },
    { id: "lab_nightstand", sprite: "nightstand", gx: 2, gy: 0, anchor: "floor" },
    { id: "lab_tv", sprite: "tv", gx: 3, gy: 0, anchor: "floor" },
    { id: "lab_chair", sprite: "chairDown", gx: 5, gy: 0, anchor: "floor" },
    { id: "lab_table", sprite: "table", gx: 6, gy: 0, anchor: "floor" },
    { id: "lab_plant", sprite: "plant", gx: 8, gy: 0, anchor: "floor" },
    { id: "lab_appliance", sprite: "appliance", gx: 9, gy: 0, anchor: "floor" },
    { id: "lab_rug", sprite: "rug", gx: 4, gy: 1, anchor: "floor" },
    { id: "lab_shelf", sprite: "shelf", gx: 7, gy: 2, anchor: "wall" },
    { id: "lab_poster", sprite: "posterSw", gx: 1, gy: 3, anchor: "wall" },
  ];

  return {
    ...createDefaultRoomDocument(),
    expansionsRight: 1,
    furniture,
  };
}

/** Max dirt visuals (spider webs) — 8 days idle → level 3. */
export function createDirtyCleanlinessState(
  daysIdle: number = 8,
): RoomCleanlinessState {
  const idleMs = daysIdle * 24 * 60 * 60 * 1000;
  const at = Date.now() - idleMs;
  return {
    lastActivityAt: at,
    lastCleanedAt: at,
    dirtLevel: 3,
  };
}
