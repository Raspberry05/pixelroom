import type { ImageSourcePropType } from "react-native";
import { FURNITURE } from "./sprites";

/** Native pixel size of one world grid cell (matches most interior tiles). */
export const GRID_CELL = 16;

/**
 * Single scale for the whole room — floor, furniture, props.
 * Integer preferred so pixels stay sharp; VIEW_BOOST then enlarges for mobile readability.
 */
export const WORLD_SCALE = 3;
/**
 * ~150% larger room/characters/windows for comfortable mobile viewing.
 * Change this (e.g. 1.25 / 1.5 / 1.75) to resize the whole room proportionally.
 * File: apps/mobile/data/roomLayout.ts
 */
export const VIEW_BOOST = 1.05;

export const CELL_PX = Math.round(GRID_CELL * WORLD_SCALE * VIEW_BOOST);

/** Visible exterior wall strip past the left/right end of the room (scroll limit cue). */
export const EDGE_WALL_PX = 36;

/**
 * One room "chunk" is a fixed grid of CHUNK_CELLS cells at near-constant pixel size.
 * Cell display size tracks CELL_PX (± soft scale for very tall/short stages).
 * When the world is wider than the viewport, the stage scrolls horizontally —
 * cells are never shrunk to fit.
 */
export const PHONE_ASPECT = 9 / 16;
/** Soft reference stage height for mild display scaling. */
export const REF_STAGE_HEIGHT = 640;
/** Soft scale bounds so giant/tiny stages don't smash proportions vs characters. */
export const DISPLAY_SCALE_MIN = 0.92;
export const DISPLAY_SCALE_MAX = 1.12;
/** @deprecated chunks no longer cap by CSS width; kept for callers. */
export const CHUNK_MAX_DISPLAY_W = 390;
/** Grid cells across one phone-ratio chunk (fixed, so layouts stay stable). */
export const CHUNK_CELLS = 12;
export const ROOM_EXPAND_COST = 120;
export const MAX_SIDE_EXPANSIONS = 2;

export type FurnitureSprite =
  | "table"
  | "sideTable"
  | "bed"
  | "chairDown"
  | "chairLeft"
  | "chairRight"
  | "chairUp"
  | "nightstand"
  | "plant"
  | "rug"
  | "appliance"
  | "tv"
  | "candle"
  | "shelf"
  | "wallArt"
  | "wallStripe"
  | "wallOrange"
  | "wallWhite"
  | "wallStripeBase"
  | "wallOrangeBase"
  | "wallWhiteBase"
  | "posterSw"
  | "posterFace"
  | "floor"
  | "floorWood"
  | "tvScreen0"
  | "tvScreen1"
  | "tvScreen2"
  | "tvScreen3";

export type FurnitureAnchor = "floor" | "wall";

export type PlacedFurniture = {
  id: string;
  sprite: FurnitureSprite;
  /** Grid X (left edge of sprite in cells). */
  gx: number;
  /**
   * Floor items: cells above the floor baseline (0 = on floor).
   * Wall items: cells above the floor/wall seam.
   */
  gy: number;
  anchor: FurnitureAnchor;
  /** Whether furniture is still packed and needs to be unpacked via mini-game. */
  packed?: boolean;
};

/** Sparse tile maps: key = `${gx},${gy}`. */
export type TileMap = Record<string, true>;

export type PlacedWindow = {
  id: string;
  gx: number;
  /** Cells above the floor/wall seam. */
  gy: number;
  /** Width in grid cells. */
  w: number;
  /** Height in grid cells. */
  h: number;
};

export type RoomDocument = {
  version: 4;
  furniture: PlacedFurniture[];
  windows: PlacedWindow[];
  /** Extra room chunks to the left of the home chunk (0..MAX). */
  expansionsLeft: number;
  /** Extra room chunks to the right of the home chunk (0..MAX). */
  expansionsRight: number;
  /**
   * When true, every floor cell is tiled by default.
   * `floorTiles` then acts as a subtractive erase map (key present = cleared).
   * When false, only keys in `floorTiles` are painted (additive).
   */
  floorFill: boolean;
  floorTiles: TileMap;
  /** Painted wall-panel cells above the floor seam (additive). */
  wallTiles: TileMap;
};

export type SpriteMeta = {
  id: FurnitureSprite;
  label: string;
  source: ImageSourcePropType;
  nativeW: number;
  nativeH: number;
  defaultAnchor: FurnitureAnchor;
  /** Furniture / decor placeable as objects. */
  paintable: boolean;
  /** Can be used as a brush for floor/wall tile painting. */
  tileBrush: "floor" | "wall" | null;
};

export const SPRITE_CATALOG: SpriteMeta[] = [
  {
    id: "floor",
    label: "Floor tile",
    source: FURNITURE.floor,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: false,
    tileBrush: "floor",
  },
  {
    id: "floorWood",
    label: "Wood floor",
    source: FURNITURE.floorWood,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: false,
    tileBrush: "floor",
  },
  {
    id: "wallStripe",
    label: "Wall stripe",
    source: FURNITURE.wallStripe,
    nativeW: 16,
    nativeH: 28,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: "wall",
  },
  {
    id: "wallOrange",
    label: "Wall orange",
    source: FURNITURE.wallOrange,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: "wall",
  },
  {
    id: "wallWhite",
    label: "Wall white",
    source: FURNITURE.wallWhite,
    nativeW: 16,
    nativeH: 28,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: "wall",
  },
  {
    id: "wallStripeBase",
    label: "Wall base (stripe)",
    source: FURNITURE.wallStripeBase,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "wallOrangeBase",
    label: "Wall base (orange)",
    source: FURNITURE.wallOrangeBase,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "wallWhiteBase",
    label: "Wall base (white)",
    source: FURNITURE.wallWhiteBase,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "table",
    label: "Table",
    source: FURNITURE.table,
    nativeW: 30,
    nativeH: 21,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "sideTable",
    label: "Side table",
    source: FURNITURE.sideTable,
    nativeW: 16,
    nativeH: 15,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "bed",
    label: "Bed",
    source: FURNITURE.bed,
    nativeW: 30,
    nativeH: 21,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "chairDown",
    label: "Chair ↓",
    source: FURNITURE.chairDown,
    nativeW: 16,
    nativeH: 20,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "chairLeft",
    label: "Chair ←",
    source: FURNITURE.chairLeft,
    nativeW: 16,
    nativeH: 20,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "chairRight",
    label: "Chair →",
    source: FURNITURE.chairRight,
    nativeW: 16,
    nativeH: 20,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "chairUp",
    label: "Chair ↑",
    source: FURNITURE.chairUp,
    nativeW: 14,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "nightstand",
    label: "Nightstand",
    source: FURNITURE.nightstand,
    nativeW: 16,
    nativeH: 15,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "plant",
    label: "Plant",
    source: FURNITURE.plant,
    nativeW: 14,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "candle",
    label: "Candle",
    source: FURNITURE.candle,
    nativeW: 7,
    nativeH: 11,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "shelf",
    label: "Shelf",
    source: FURNITURE.shelf,
    nativeW: 24,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "rug",
    label: "Rug",
    source: FURNITURE.rug,
    nativeW: 32,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "appliance",
    label: "Appliance",
    source: FURNITURE.appliance,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "tv",
    label: "TV",
    source: FURNITURE.tv,
    nativeW: 16,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "tvScreen0",
    label: "TV screen A",
    source: FURNITURE.tvScreen0,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "tvScreen1",
    label: "TV screen B",
    source: FURNITURE.tvScreen1,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "tvScreen2",
    label: "TV screen C",
    source: FURNITURE.tvScreen2,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "tvScreen3",
    label: "TV screen D",
    source: FURNITURE.tvScreen3,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "wallArt",
    label: "Wall art",
    source: FURNITURE.wallArt,
    nativeW: 16,
    nativeH: 28,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "posterSw",
    label: "Poster SW",
    source: FURNITURE.posterSw,
    nativeW: 16,
    nativeH: 31,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
  {
    id: "posterFace",
    label: "Poster face",
    source: FURNITURE.posterFace,
    nativeW: 13,
    nativeH: 16,
    defaultAnchor: "wall",
    paintable: true,
    tileBrush: null,
  },
];

export const SPRITE_BY_ID: Record<FurnitureSprite, SpriteMeta> =
  SPRITE_CATALOG.reduce(
    (acc, meta) => {
      acc[meta.id] = meta;
      return acc;
    },
    {} as Record<FurnitureSprite, SpriteMeta>,
  );

export function tileKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

export function parseTileKey(key: string): { gx: number; gy: number } {
  const [a, b] = key.split(",");
  return { gx: Number(a) || 0, gy: Number(b) || 0 };
}

export function hasFloorTile(
  doc: RoomDocument,
  gx: number,
  gy: number,
): boolean {
  const key = tileKey(gx, gy);
  if (doc.floorFill) return !doc.floorTiles[key];
  return Boolean(doc.floorTiles[key]);
}

export function setFloorTile(
  doc: RoomDocument,
  gx: number,
  gy: number,
  paint: boolean,
): RoomDocument {
  const key = tileKey(gx, gy);
  const floorTiles = { ...doc.floorTiles };
  if (doc.floorFill) {
    // fill mode: map stores erasures
    if (paint) delete floorTiles[key];
    else floorTiles[key] = true;
  } else if (paint) {
    floorTiles[key] = true;
  } else {
    delete floorTiles[key];
  }
  return { ...doc, floorTiles };
}

export function setWallTile(
  doc: RoomDocument,
  gx: number,
  gy: number,
  paint: boolean,
): RoomDocument {
  const key = tileKey(gx, gy);
  const wallTiles = { ...doc.wallTiles };
  if (paint) wallTiles[key] = true;
  else delete wallTiles[key];
  return { ...doc, wallTiles };
}

export function drawnSize(
  sprite: FurnitureSprite,
  cellPx: number = CELL_PX,
): { w: number; h: number } {
  const meta = SPRITE_BY_ID[sprite];
  if (!meta) return { w: cellPx, h: cellPx };
  return {
    w: (meta.nativeW / GRID_CELL) * cellPx,
    h: (meta.nativeH / GRID_CELL) * cellPx,
  };
}

export function totalChunks(
  doc: Pick<RoomDocument, "expansionsLeft" | "expansionsRight">,
): number {
  return 1 + doc.expansionsLeft + doc.expansionsRight;
}

export function worldCellCount(
  doc: Pick<RoomDocument, "expansionsLeft" | "expansionsRight">,
): number {
  return totalChunks(doc) * CHUNK_CELLS;
}

/** Home (center) chunk starts at this gx. */
export function homeChunkOriginGx(
  doc: Pick<RoomDocument, "expansionsLeft">,
): number {
  return doc.expansionsLeft * CHUNK_CELLS;
}

function shiftTileMap(map: TileMap, deltaGx: number): TileMap {
  const next: TileMap = {};
  for (const key of Object.keys(map)) {
    const { gx, gy } = parseTileKey(key);
    next[tileKey(gx + deltaGx, gy)] = true;
  }
  return next;
}

/** Buy a chunk on the left — shifts world so existing content stays put. */
export function expandRoomLeft(doc: RoomDocument): RoomDocument {
  if (doc.expansionsLeft >= MAX_SIDE_EXPANSIONS) return doc;
  const delta = CHUNK_CELLS;
  return {
    ...doc,
    expansionsLeft: doc.expansionsLeft + 1,
    furniture: doc.furniture.map((p) => ({ ...p, gx: p.gx + delta })),
    windows: doc.windows.map((w) => ({ ...w, gx: w.gx + delta })),
    floorTiles: shiftTileMap(doc.floorTiles, delta),
    wallTiles: shiftTileMap(doc.wallTiles, delta),
  };
}

export function expandRoomRight(doc: RoomDocument): RoomDocument {
  if (doc.expansionsRight >= MAX_SIDE_EXPANSIONS) return doc;
  return {
    ...doc,
    expansionsRight: doc.expansionsRight + 1,
  };
}

let placeCounter = 0;

export function createPlacementId(sprite: string): string {
  placeCounter += 1;
  return `${sprite}_${Date.now().toString(36)}_${placeCounter}`;
}

export const DEFAULT_WINDOWS: PlacedWindow[] = [
  {
    id: "window_main",
    gx: Math.floor(CHUNK_CELLS / 2) - 3,
    gy: 3,
    w: 6,
    h: 4,
  },
];

/** Empty room — player places everything from inventory. */
export const DEFAULT_FURNITURE: PlacedFurniture[] = [];

/** @deprecated use createDefaultRoomDocument().furniture */
export const DEFAULT_ROOM_LAYOUT = DEFAULT_FURNITURE;

export function createDefaultRoomDocument(): RoomDocument {
  return {
    version: 4,
    furniture: [],
    windows: DEFAULT_WINDOWS.map((w) => ({ ...w })),
    expansionsLeft: 0,
    expansionsRight: 0,
    floorFill: true,
    floorTiles: {},
    wallTiles: {},
  };
}

export type EditTool =
  | { kind: "move" }
  | { kind: "paint"; sprite: FurnitureSprite }
  | { kind: "tile"; surface: "floor" | "wall" }
  | { kind: "window" }
  | { kind: "erase" };

export function snapToGrid(px: number, cellPx: number = CELL_PX): number {
  return Math.round(px / cellPx);
}

export function clampGrid(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isRoomDocument(value: unknown): value is RoomDocument {
  if (!value || typeof value !== "object") return false;
  const v = value as {
    version?: number;
    furniture?: unknown;
    windows?: unknown;
  };
  return Array.isArray(v.furniture) && typeof v.version === "number";
}

/**
 * Normalize saves. Versions below 4 get a clean wall + window + floor starter
 * with no side expansions.
 */
export function normalizeRoomDocument(value: unknown): RoomDocument {
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as RoomDocument).furniture)
  ) {
    const v = value as RoomDocument & { version?: number };
    if (v.version >= 4 && Array.isArray(v.windows)) {
      return {
        version: 4,
        furniture: v.furniture,
        windows: v.windows,
        expansionsLeft: Math.min(
          MAX_SIDE_EXPANSIONS,
          Math.max(0, v.expansionsLeft ?? 0),
        ),
        expansionsRight: Math.min(
          MAX_SIDE_EXPANSIONS,
          Math.max(0, v.expansionsRight ?? 0),
        ),
        floorFill: v.floorFill ?? true,
        floorTiles: v.floorTiles ?? {},
        wallTiles: v.wallTiles ?? {},
      };
    }
  }
  return createDefaultRoomDocument();
}
