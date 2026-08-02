import type { FurnitureSprite, PlacedFurniture } from "./roomLayout";
import { GRID_CELL, SPRITE_BY_ID } from "./roomLayout";

/**
 * Collision classes for placed room objects.
 * - solid: tables, beds, appliances — cannot overlap each other or seats
 * - seat: chairs — cannot overlap solids/seats
 * - rug: underlay — anything may sit on/over
 * - surfaceItem: small props — may sit on solids; not on other surfaceItems stacking freely is ok
 * - wallDecor: posters/art — cannot overlap other wallDecor
 * - window: wall openings — cannot overlap other windows
 */
export type CollisionKind =
  | "solid"
  | "seat"
  | "rug"
  | "surfaceItem"
  | "wallDecor"
  | "window";

export type InventoryItemId = string;

export type InventoryItemDef = {
  id: InventoryItemId;
  name: string;
  /** Links to a placeable sprite, or special kinds. */
  sprite: FurnitureSprite | "window";
  kind: "furniture" | "tile" | "window";
  collision: CollisionKind | null;
  /** Store price to buy +1. */
  price: number;
  /** Starting owned count (before default room consumes placed pieces). */
  starterQty: number;
};

/** What may occupy the same footprint. */
const ALLOW: Record<CollisionKind, ReadonlySet<CollisionKind>> = {
  solid: new Set(["rug", "surfaceItem"]),
  seat: new Set(["rug"]),
  rug: new Set(["solid", "seat", "rug", "surfaceItem"]),
  surfaceItem: new Set(["solid", "rug", "surfaceItem"]),
  wallDecor: new Set(["window"]),
  window: new Set(["wallDecor"]),
};

export const INVENTORY_CATALOG: InventoryItemDef[] = [
  { id: "tile_floor", name: "Floor tile", sprite: "floor", kind: "tile", collision: null, price: 5, starterQty: 48 },
  { id: "tile_floor_wood", name: "Wood floor", sprite: "floorWood", kind: "tile", collision: null, price: 6, starterQty: 24 },
  { id: "tile_wall", name: "Wall stripe", sprite: "wallStripe", kind: "tile", collision: null, price: 8, starterQty: 24 },
  { id: "tile_wall_orange", name: "Wall orange", sprite: "wallOrange", kind: "tile", collision: null, price: 8, starterQty: 16 },
  { id: "tile_wall_white", name: "Wall white", sprite: "wallWhite", kind: "tile", collision: null, price: 8, starterQty: 16 },
  { id: "window_basic", name: "Window", sprite: "window", kind: "window", collision: "window", price: 60, starterQty: 2 },
  { id: "furn_table", name: "Table", sprite: "table", kind: "furniture", collision: "solid", price: 80, starterQty: 2 },
  { id: "furn_side_table", name: "Side table", sprite: "sideTable", kind: "furniture", collision: "solid", price: 45, starterQty: 2 },
  { id: "furn_bed", name: "Bed", sprite: "bed", kind: "furniture", collision: "solid", price: 120, starterQty: 1 },
  { id: "furn_nightstand", name: "Nightstand", sprite: "nightstand", kind: "furniture", collision: "solid", price: 35, starterQty: 2 },
  { id: "furn_appliance", name: "Appliance", sprite: "appliance", kind: "furniture", collision: "solid", price: 90, starterQty: 1 },
  { id: "furn_stove", name: "Stove", sprite: "appliance", kind: "furniture", collision: "solid", price: 100, starterQty: 0 },
  { id: "furn_tv", name: "TV", sprite: "tv", kind: "furniture", collision: "solid", price: 110, starterQty: 0 },
  // One chair SKU — facing is chosen at place time (rotations), not separate store items.
  { id: "furn_chair", name: "Chair", sprite: "chairDown", kind: "furniture", collision: "seat", price: 25, starterQty: 9 },
  { id: "furn_rug", name: "Rug", sprite: "rug", kind: "furniture", collision: "rug", price: 40, starterQty: 2 },
  { id: "furn_plant", name: "Plant", sprite: "plant", kind: "furniture", collision: "surfaceItem", price: 20, starterQty: 3 },
  { id: "furn_candle", name: "Candle", sprite: "candle", kind: "furniture", collision: "surfaceItem", price: 12, starterQty: 2 },
  { id: "furn_shelf", name: "Shelf", sprite: "shelf", kind: "furniture", collision: "wallDecor", price: 28, starterQty: 1 },
  { id: "furn_wall_art", name: "Wall art", sprite: "wallArt", kind: "furniture", collision: "wallDecor", price: 30, starterQty: 2 },
  { id: "furn_poster_sw", name: "Poster SW", sprite: "posterSw", kind: "furniture", collision: "wallDecor", price: 18, starterQty: 1 },
  { id: "furn_poster_face", name: "Poster face", sprite: "posterFace", kind: "furniture", collision: "wallDecor", price: 18, starterQty: 1 },
  { id: "furn_wall_panel", name: "Wall panel (object)", sprite: "wallStripe", kind: "furniture", collision: "wallDecor", price: 22, starterQty: 2 },
  { id: "furn_wall_base", name: "Wall base", sprite: "wallStripeBase", kind: "furniture", collision: "wallDecor", price: 10, starterQty: 8 },
];

export const INV_BY_ID: Record<string, InventoryItemDef> = Object.fromEntries(
  INVENTORY_CATALOG.map((d) => [d.id, d]),
);

const SPRITE_TO_FURN_ID: Partial<Record<FurnitureSprite, InventoryItemId>> = {
  table: "furn_table",
  sideTable: "furn_side_table",
  bed: "furn_bed",
  nightstand: "furn_nightstand",
  appliance: "furn_appliance",
  tv: "furn_tv",
  chairDown: "furn_chair",
  chairLeft: "furn_chair",
  chairRight: "furn_chair",
  chairUp: "furn_chair",
  rug: "furn_rug",
  plant: "furn_plant",
  candle: "furn_candle",
  shelf: "furn_shelf",
  wallArt: "furn_wall_art",
  posterSw: "furn_poster_sw",
  posterFace: "furn_poster_face",
  wallStripe: "furn_wall_panel",
  wallStripeBase: "furn_wall_base",
  floor: "tile_floor",
  floorWood: "tile_floor_wood",
  wallOrange: "tile_wall_orange",
  wallWhite: "tile_wall_white",
};

export function inventoryIdForSprite(sprite: FurnitureSprite): InventoryItemId | null {
  return SPRITE_TO_FURN_ID[sprite] ?? null;
}

export function inventoryIdForTile(surface: "floor" | "wall"): InventoryItemId {
  return surface === "floor" ? "tile_floor" : "tile_wall";
}

export type InventoryState = Record<InventoryItemId, number>;

/** Chair facing variants — same inventory item, different placeable sprites. */
export const CHAIR_ROTATIONS: FurnitureSprite[] = [
  "chairDown",
  "chairLeft",
  "chairRight",
  "chairUp",
];

export function isChairSprite(sprite: FurnitureSprite): boolean {
  return CHAIR_ROTATIONS.includes(sprite);
}

const LEGACY_CHAIR_IDS = ["furn_chair_l", "furn_chair_r", "furn_chair_u"] as const;

/** Fold old directional chair SKUs into `furn_chair`. */
export function migrateChairInventory(inv: InventoryState): InventoryState {
  let extras = 0;
  for (const id of LEGACY_CHAIR_IDS) {
    extras += inv[id] ?? 0;
  }
  if (extras <= 0 && inv.furn_chair != null) return inv;
  const next = { ...inv };
  if (extras > 0) {
    next.furn_chair = (next.furn_chair ?? 0) + extras;
    for (const id of LEGACY_CHAIR_IDS) {
      next[id] = 0;
    }
  }
  return next;
}

export function createStarterInventory(): InventoryState {
  const inv: InventoryState = {};
  for (const def of INVENTORY_CATALOG) {
    inv[def.id] = def.starterQty;
  }
  return inv;
}

/** Deduct pieces already used by the default room layout. */
export function consumePlacedFromInventory(
  inv: InventoryState,
  furniture: PlacedFurniture[],
  windowCount: number,
): InventoryState {
  const next = { ...inv };
  for (const piece of furniture) {
    const id = inventoryIdForSprite(piece.sprite);
    if (!id) continue;
    next[id] = Math.max(0, (next[id] ?? 0) - 1);
  }
  next.window_basic = Math.max(0, (next.window_basic ?? 0) - windowCount);
  return next;
}

export function getQty(inv: InventoryState, id: InventoryItemId): number {
  return inv[id] ?? 0;
}

export function canSpend(inv: InventoryState, id: InventoryItemId, n = 1): boolean {
  return getQty(inv, id) >= n;
}

export function spend(
  inv: InventoryState,
  id: InventoryItemId,
  n = 1,
): InventoryState | null {
  if (!canSpend(inv, id, n)) return null;
  return { ...inv, [id]: getQty(inv, id) - n };
}

export function refund(
  inv: InventoryState,
  id: InventoryItemId,
  n = 1,
): InventoryState {
  return { ...inv, [id]: getQty(inv, id) + n };
}

export function collisionForSprite(sprite: FurnitureSprite): CollisionKind | null {
  const id = inventoryIdForSprite(sprite);
  if (!id) return null;
  return INV_BY_ID[id]?.collision ?? null;
}

export type Footprint = {
  gx: number;
  gy: number;
  /** Width in grid cells (can be fractional). */
  w: number;
  /** Height in grid cells (can be fractional). */
  h: number;
  anchor: "floor" | "wall";
  kind: CollisionKind;
};

/**
 * Floor furniture stands on the ground plane — sprite *visual* height must not
 * claim extra grid rows upward. Use a half-cell tall ground hitbox instead.
 * Wall decor keeps full cell height so posters can't stack on the same tiles.
 */
export function footprintFor(
  sprite: FurnitureSprite,
  gx: number,
  gy: number,
  anchor: "floor" | "wall",
): Footprint | null {
  const kind = collisionForSprite(sprite);
  if (!kind) return null;
  const meta = SPRITE_BY_ID[sprite];
  if (!meta) return null;

  const w = Math.max(1, Math.round(meta.nativeW / GRID_CELL));
  const visualH = Math.max(1, meta.nativeH / GRID_CELL);

  if (anchor === "wall") {
    return {
      gx,
      gy,
      w,
      h: Math.max(1, Math.round(visualH)),
      anchor,
      kind,
    };
  }

  // Floor / seat / rug / surface: collide on a half-cell ground strip only.
  return {
    gx,
    gy,
    w,
    h: 0.5,
    anchor,
    kind,
  };
}

export function footprintsOverlap(a: Footprint, b: Footprint): boolean {
  if (a.anchor !== b.anchor) return false;
  return !(
    a.gx + a.w <= b.gx ||
    b.gx + b.w <= a.gx ||
    a.gy + a.h <= b.gy ||
    b.gy + b.h <= a.gy
  );
}

export function kindsMayOverlap(a: CollisionKind, b: CollisionKind): boolean {
  return ALLOW[a].has(b) || ALLOW[b].has(a);
}

export type PlaceBlockReason =
  | "inventory"
  | "collision"
  | "ok";

export function canPlaceFurniture(input: {
  sprite: FurnitureSprite;
  gx: number;
  gy: number;
  anchor: "floor" | "wall";
  furniture: PlacedFurniture[];
  ignoreId?: string | null;
  inventory: InventoryState;
  /** When moving an already-placed piece, skip inventory check. */
  skipInventory?: boolean;
}): { ok: boolean; reason: PlaceBlockReason; message?: string } {
  const invId = inventoryIdForSprite(input.sprite);
  if (!input.skipInventory) {
    if (!invId || !canSpend(input.inventory, invId)) {
      return {
        ok: false,
        reason: "inventory",
        message: "You don't own any more of that item",
      };
    }
  }

  const nextFp = footprintFor(input.sprite, input.gx, input.gy, input.anchor);
  if (!nextFp) return { ok: true, reason: "ok" };

  for (const other of input.furniture) {
    if (input.ignoreId && other.id === input.ignoreId) continue;
    const otherFp = footprintFor(other.sprite, other.gx, other.gy, other.anchor);
    if (!otherFp) continue;
    if (!footprintsOverlap(nextFp, otherFp)) continue;
    if (kindsMayOverlap(nextFp.kind, otherFp.kind)) continue;
    return {
      ok: false,
      reason: "collision",
      message: `Can't place on top of ${other.sprite}`,
    };
  }

  return { ok: true, reason: "ok" };
}

/**
 * Characters may occupy solid/seat footprints while sitting or sleeping.
 * Walking on top of solids should be blocked by sim movement later.
 */
export const CHARACTER_OCCUPY_OK_WHEN: ReadonlySet<string> = new Set([
  "sit",
  "sleep",
]);
