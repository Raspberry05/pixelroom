import type { ImageSourcePropType } from "react-native";
import { FURNITURE } from "./sprites";
import { effectiveNativeSize } from "./spriteOverrides";

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
/**
 * Shared floor depth in grid cells — same on phone and tablet.
 * Extra stage height grows the wall, not more floor rows (keeps furniture gy aligned).
 */
export const FLOOR_DEPTH_CELLS = 7;
/** Max fraction of stage height the floor band may use (short phones). */
export const FLOOR_HEIGHT_MAX_RATIO = 0.55;
/** @deprecated chunks no longer cap by CSS width; kept for callers. */
export const CHUNK_MAX_DISPLAY_W = 390;
/** Grid cells across one phone-ratio chunk (fixed, so layouts stay stable). */
export const CHUNK_CELLS = 12;
/** Base coin cost for the first expansion on a side. */
export const ROOM_EXPAND_COST = 120;
export const MAX_SIDE_EXPANSIONS = 2;

/**
 * Cost to buy the next chunk on one side. Doubles each time that side
 * has already been expanded (120 → 240 → 480 …).
 */
export function expandCostForSide(expansionsOnSide: number): number {
  const n = Math.max(0, Math.floor(expansionsOnSide));
  return ROOM_EXPAND_COST * 2 ** n;
}

/** Sum paid for N expansions on one side (0→1→2… using progressive pricing). */
export function totalExpansionCostForCount(count: number): number {
  let total = 0;
  for (let i = 0; i < Math.max(0, count); i += 1) {
    total += expandCostForSide(i);
  }
  return total;
}

/** Cost to grow one side from `fromCount` up to (not including) `toCount`. */
export function expansionCostFromTo(fromCount: number, toCount: number): number {
  let total = 0;
  for (let i = Math.max(0, fromCount); i < Math.max(0, toCount); i += 1) {
    total += expandCostForSide(i);
  }
  return total;
}

export type ExpansionPurchase = {
  side: "left" | "right";
  /** 0-based index on that side when purchased. */
  index: number;
  cost: number;
  byUserKey: string;
};

export function expansionPurchasesForRange(
  side: "left" | "right",
  fromCount: number,
  toCount: number,
  byUserKey: string,
): ExpansionPurchase[] {
  const out: ExpansionPurchase[] = [];
  for (let i = Math.max(0, fromCount); i < Math.max(0, toCount); i += 1) {
    out.push({
      side,
      index: i,
      cost: expandCostForSide(i),
      byUserKey,
    });
  }
  return out;
}

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
  | "tvScreen3"
  | "tvScreen4"
  | "tvScreen5"
  | "tvScreen6"
  | "tvScreen7";

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
  /**
   * Active visual state (e.g. TV `off` / `channelA` / `channelB`).
   * Undefined → catalog default / first sequence.
   */
  visualStateId?: string;
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
  /** Who paid for each side expansion — used to refund coins on room reset. */
  expansionPurchases?: ExpansionPurchase[];
};

/** Coins to refund a user for expansions they personally bought. */
export function expansionRefundForUser(
  doc: Pick<RoomDocument, "expansionPurchases">,
  userKey: string,
): number {
  return (doc.expansionPurchases ?? [])
    .filter((p) => p.byUserKey === userKey)
    .reduce((sum, p) => sum + p.cost, 0);
}

/**
 * Legacy rooms with no purchase log: estimate total expansion spend
 * (refunded to the reset proposer only).
 */
export function estimatedExpansionRefund(
  doc: Pick<RoomDocument, "expansionsLeft" | "expansionsRight" | "expansionPurchases">,
): number {
  if ((doc.expansionPurchases ?? []).length > 0) {
    return (doc.expansionPurchases ?? []).reduce((sum, p) => sum + p.cost, 0);
  }
  return (
    totalExpansionCostForCount(doc.expansionsLeft) +
    totalExpansionCostForCount(doc.expansionsRight)
  );
}

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
  /**
   * Overlay-only art (e.g. TV screen frames) — not a free-standing placeable.
   * Drawn on top of a parent furniture piece via visual states.
   */
  overlayFrame?: boolean;
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
    label: "Chair",
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
    // Rotation of Chair — pick via rotate chips, not as its own palette SKU.
    paintable: false,
    tileBrush: null,
  },
  {
    id: "chairRight",
    label: "Chair →",
    source: FURNITURE.chairRight,
    nativeW: 16,
    nativeH: 20,
    defaultAnchor: "floor",
    paintable: false,
    tileBrush: null,
  },
  {
    id: "chairUp",
    label: "Chair ↑",
    source: FURNITURE.chairUp,
    nativeW: 14,
    nativeH: 16,
    defaultAnchor: "floor",
    paintable: false,
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
    label: "TV screen A1",
    source: FURNITURE.tvScreen0,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen1",
    label: "TV screen A2",
    source: FURNITURE.tvScreen1,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen2",
    label: "TV screen A3",
    source: FURNITURE.tvScreen2,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen3",
    label: "TV screen A4",
    source: FURNITURE.tvScreen3,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen4",
    label: "TV screen B1",
    source: FURNITURE.tvScreen4,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen5",
    label: "TV screen B2",
    source: FURNITURE.tvScreen5,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen6",
    label: "TV screen B3",
    source: FURNITURE.tvScreen6,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
  },
  {
    id: "tvScreen7",
    label: "TV screen B4",
    source: FURNITURE.tvScreen7,
    nativeW: 10,
    nativeH: 6,
    defaultAnchor: "wall",
    paintable: false,
    tileBrush: null,
    overlayFrame: true,
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
  // DevTools catalog overrides (spriteWidth/Height) apply live after save.
  const { w: nativeW, h: nativeH } = effectiveNativeSize(
    sprite,
    meta.nativeW,
    meta.nativeH,
  );
  return {
    w: (nativeW / GRID_CELL) * cellPx,
    h: (nativeH / GRID_CELL) * cellPx,
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

export type ShrinkRoomResult = {
  document: RoomDocument;
  removedFurniture: PlacedFurniture[];
  removedWindows: PlacedWindow[];
  /** Painted floor cells removed (only when not floorFill). */
  removedFloorTiles: number;
  removedWallTiles: number;
  /** Coins to return for the removed expansion. */
  refundCoins: number;
};

function furnitureWidthCells(sprite: FurnitureSprite): number {
  const meta = SPRITE_BY_ID[sprite];
  if (!meta) return 1;
  const { w } = effectiveNativeSize(sprite, meta.nativeW, meta.nativeH);
  return Math.max(0.01, w / GRID_CELL);
}

function furnitureOverlapsGxRange(
  piece: PlacedFurniture,
  minGx: number,
  maxGxExclusive: number,
): boolean {
  const w = furnitureWidthCells(piece.sprite);
  return piece.gx < maxGxExclusive && piece.gx + w > minGx;
}

function windowOverlapsGxRange(
  win: PlacedWindow,
  minGx: number,
  maxGxExclusive: number,
): boolean {
  return win.gx < maxGxExclusive && win.gx + win.w > minGx;
}

function splitTileMapInRange(
  map: TileMap,
  minGx: number,
  maxGxExclusive: number,
): { kept: TileMap; removedCount: number } {
  const kept: TileMap = {};
  let removedCount = 0;
  for (const key of Object.keys(map)) {
    const { gx, gy } = parseTileKey(key);
    if (gx >= minGx && gx < maxGxExclusive) {
      removedCount += 1;
    } else {
      kept[tileKey(gx, gy)] = true;
    }
  }
  return { kept, removedCount };
}

function popLastExpansionPurchase(
  purchases: ExpansionPurchase[] | undefined,
  side: "left" | "right",
  index: number,
): { remaining: ExpansionPurchase[]; refundCoins: number } {
  const list = purchases ?? [];
  // Prefer exact index match (newest last); fall back to last purchase on that side.
  let removeAt = -1;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i];
    if (entry && entry.side === side && entry.index === index) {
      removeAt = i;
      break;
    }
  }
  if (removeAt < 0) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const entry = list[i];
      if (entry && entry.side === side) {
        removeAt = i;
        break;
      }
    }
  }
  if (removeAt < 0) {
    return {
      remaining: list,
      refundCoins: expandCostForSide(index),
    };
  }
  const removed = list[removeAt];
  const refundCoins = removed?.cost ?? expandCostForSide(index);
  return {
    remaining: [...list.slice(0, removeAt), ...list.slice(removeAt + 1)],
    refundCoins,
  };
}

/** Remove the outermost left expansion; contents in that strip are returned for inventory. */
export function shrinkRoomLeft(doc: RoomDocument): ShrinkRoomResult | null {
  if (doc.expansionsLeft <= 0) return null;
  const minGx = 0;
  const maxGx = CHUNK_CELLS;
  const removedFurniture = doc.furniture.filter((p) =>
    furnitureOverlapsGxRange(p, minGx, maxGx),
  );
  const keptFurniture = doc.furniture
    .filter((p) => !furnitureOverlapsGxRange(p, minGx, maxGx))
    .map((p) => ({ ...p, gx: p.gx - CHUNK_CELLS }));
  const removedWindows = doc.windows.filter((w) =>
    windowOverlapsGxRange(w, minGx, maxGx),
  );
  const keptWindows = doc.windows
    .filter((w) => !windowOverlapsGxRange(w, minGx, maxGx))
    .map((w) => ({ ...w, gx: w.gx - CHUNK_CELLS }));

  const floorSplit = splitTileMapInRange(doc.floorTiles, minGx, maxGx);
  const wallSplit = splitTileMapInRange(doc.wallTiles, minGx, maxGx);
  const removedIndex = doc.expansionsLeft - 1;
  const { remaining, refundCoins } = popLastExpansionPurchase(
    doc.expansionPurchases,
    "left",
    removedIndex,
  );

  return {
    document: {
      ...doc,
      expansionsLeft: doc.expansionsLeft - 1,
      furniture: keptFurniture,
      windows: keptWindows,
      floorTiles: shiftTileMap(floorSplit.kept, -CHUNK_CELLS),
      wallTiles: shiftTileMap(wallSplit.kept, -CHUNK_CELLS),
      expansionPurchases: remaining,
    },
    removedFurniture,
    removedWindows,
    removedFloorTiles: doc.floorFill ? 0 : floorSplit.removedCount,
    removedWallTiles: wallSplit.removedCount,
    refundCoins,
  };
}

/** Remove the outermost right expansion; contents in that strip are returned for inventory. */
export function shrinkRoomRight(doc: RoomDocument): ShrinkRoomResult | null {
  if (doc.expansionsRight <= 0) return null;
  const minGx = (totalChunks(doc) - 1) * CHUNK_CELLS;
  const maxGx = totalChunks(doc) * CHUNK_CELLS;
  const removedFurniture = doc.furniture.filter((p) =>
    furnitureOverlapsGxRange(p, minGx, maxGx),
  );
  const keptFurniture = doc.furniture.filter(
    (p) => !furnitureOverlapsGxRange(p, minGx, maxGx),
  );
  const removedWindows = doc.windows.filter((w) =>
    windowOverlapsGxRange(w, minGx, maxGx),
  );
  const keptWindows = doc.windows.filter(
    (w) => !windowOverlapsGxRange(w, minGx, maxGx),
  );

  const floorSplit = splitTileMapInRange(doc.floorTiles, minGx, maxGx);
  const wallSplit = splitTileMapInRange(doc.wallTiles, minGx, maxGx);
  const removedIndex = doc.expansionsRight - 1;
  const { remaining, refundCoins } = popLastExpansionPurchase(
    doc.expansionPurchases,
    "right",
    removedIndex,
  );

  return {
    document: {
      ...doc,
      expansionsRight: doc.expansionsRight - 1,
      furniture: keptFurniture,
      windows: keptWindows,
      floorTiles: floorSplit.kept,
      wallTiles: wallSplit.kept,
      expansionPurchases: remaining,
    },
    removedFurniture,
    removedWindows,
    removedFloorTiles: doc.floorFill ? 0 : floorSplit.removedCount,
    removedWallTiles: wallSplit.removedCount,
    refundCoins,
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
    expansionPurchases: [],
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
        expansionPurchases: Array.isArray(v.expansionPurchases)
          ? v.expansionPurchases
          : [],
      };
    }
  }
  return createDefaultRoomDocument();
}
