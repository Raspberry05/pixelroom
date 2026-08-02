import type { ImageSourcePropType } from "react-native";
import type { FurnitureSprite } from "./roomLayout";
import { SPRITE_BY_ID } from "./roomLayout";
import type { FurnitureOverlayFrame } from "./furnitureVisual";
import atlasSlices from "../assets/interior/atlas_slices.json";

const ATLAS_SRC = require("../assets/interior/interior_free.png") as number;

/** Editable overlay animation frame (atlas crop), managed in DevTools. */
export type OverlayFrameDefinition = {
  id: string;
  label: string;
  /**
   * Optional link to a built-in piece sprite (e.g. tvScreen0).
   * Used as fallback when atlas crop is missing.
   */
  linkedSprite?: FurnitureSprite;
  spriteX: number;
  spriteY: number;
  spriteWidth: number;
  spriteHeight: number;
  createdAt: number;
  updatedAt: number;
};

export type ResolvedOverlayArt =
  | {
      kind: "atlas";
      source: ImageSourcePropType;
      atlasW: number;
      atlasH: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      kind: "sprite";
      source: ImageSourcePropType;
      w: number;
      h: number;
    };

const STORAGE_KEY = "pixelroom.devtools.overlayFrames";

let cache: OverlayFrameDefinition[] | null = null;

export function invalidateOverlayFrameCache() {
  cache = null;
}

export function loadOverlayFrames(): OverlayFrameDefinition[] {
  if (cache) return cache;
  if (typeof localStorage === "undefined") {
    cache = [];
    return cache;
  }
  try {
    const raw = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as OverlayFrameDefinition[];
    cache = Array.isArray(raw) ? raw : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function saveOverlayFrames(frames: OverlayFrameDefinition[]) {
  cache = frames;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
  } catch {
    // ignore
  }
}

/** Seed TV screen slices (and any missing linked screens) into the library. */
export function seedOverlayFramesFromAtlas(
  existing: OverlayFrameDefinition[],
): OverlayFrameDefinition[] {
  const now = Date.now();
  const byId = new Map(existing.map((f) => [f.id, f]));
  const slices = (
    atlasSlices as {
      slices: Record<string, { x: number; y: number; w: number; h: number }>;
    }
  ).slices;

  const SCREEN_LINKS: Array<{
    id: string;
    label: string;
    linkedSprite: FurnitureSprite;
  }> = [
    { id: "tv_screen_0", label: "TV A1", linkedSprite: "tvScreen0" },
    { id: "tv_screen_1", label: "TV A2", linkedSprite: "tvScreen1" },
    { id: "tv_screen_2", label: "TV A3", linkedSprite: "tvScreen2" },
    { id: "tv_screen_3", label: "TV A4", linkedSprite: "tvScreen3" },
    { id: "tv_screen_4", label: "TV B1", linkedSprite: "tvScreen4" },
    { id: "tv_screen_5", label: "TV B2", linkedSprite: "tvScreen5" },
    { id: "tv_screen_6", label: "TV B3", linkedSprite: "tvScreen6" },
    { id: "tv_screen_7", label: "TV B4", linkedSprite: "tvScreen7" },
  ];

  let next = [...existing];
  for (const screen of SCREEN_LINKS) {
    if (byId.has(screen.id)) continue;
    const slice = slices[screen.id];
    if (!slice || slice.x < 0) continue;
    const row: OverlayFrameDefinition = {
      id: screen.id,
      label: screen.label,
      linkedSprite: screen.linkedSprite,
      spriteX: slice.x,
      spriteY: slice.y,
      spriteWidth: slice.w,
      spriteHeight: slice.h,
      createdAt: now,
      updatedAt: now,
    };
    next.push(row);
    byId.set(row.id, row);
  }
  return next;
}

export function createOverlayFrameTemplate(): OverlayFrameDefinition {
  const now = Date.now();
  return {
    id: `overlay_${now.toString(36)}`,
    label: "New overlay frame",
    spriteX: 0,
    spriteY: 0,
    spriteWidth: 10,
    spriteHeight: 6,
    createdAt: now,
    updatedAt: now,
  };
}

export function getOverlayFrame(
  id: string | undefined,
): OverlayFrameDefinition | null {
  if (!id) return null;
  return loadOverlayFrames().find((f) => f.id === id) ?? null;
}

/** Resolve how to draw one sequence frame (library crop or built-in sprite). */
export function resolveOverlayArt(
  frame: FurnitureOverlayFrame,
): ResolvedOverlayArt | null {
  if (frame.libraryId) {
    const lib = getOverlayFrame(frame.libraryId);
    if (lib) {
      return {
        kind: "atlas",
        source: ATLAS_SRC,
        atlasW: 160,
        atlasH: 80,
        x: lib.spriteX,
        y: lib.spriteY,
        w: Math.max(1, lib.spriteWidth),
        h: Math.max(1, lib.spriteHeight),
      };
    }
  }
  if (frame.sprite) {
    const meta = SPRITE_BY_ID[frame.sprite];
    if (!meta) return null;
    // Prefer library crop linked to this sprite when present.
    const linked = loadOverlayFrames().find(
      (f) => f.linkedSprite === frame.sprite,
    );
    if (linked) {
      return {
        kind: "atlas",
        source: ATLAS_SRC,
        atlasW: 160,
        atlasH: 80,
        x: linked.spriteX,
        y: linked.spriteY,
        w: Math.max(1, linked.spriteWidth),
        h: Math.max(1, linked.spriteHeight),
      };
    }
    return {
      kind: "sprite",
      source: meta.source,
      w: meta.nativeW,
      h: meta.nativeH,
    };
  }
  return null;
}

export function listLibraryOverlayCandidates(): OverlayFrameDefinition[] {
  return [...loadOverlayFrames()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
