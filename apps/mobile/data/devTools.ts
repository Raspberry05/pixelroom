import type { FurnitureSprite } from "./roomLayout";
import { GRID_CELL, SPRITE_CATALOG } from "./roomLayout";
import type { MiniGameType } from "./minigames";
import {
  CHAIR_ROTATIONS,
  collisionForSprite,
  INVENTORY_CATALOG,
  isChairSprite,
} from "./inventory";
import type { CollisionKind } from "./inventory";
import {
  buildTvVisualStates,
  DEFAULT_TV_OVERLAY,
  isTvScreenSprite,
  type FurnitureOverlayPlacement,
  type FurnitureVisualState,
} from "./furnitureVisual";
import {
  invalidateOverlayFrameCache,
  loadOverlayFrames,
  saveOverlayFrames,
  seedOverlayFramesFromAtlas,
  type OverlayFrameDefinition,
} from "./overlayFrames";
import { invalidateSpriteOverrides } from "./spriteOverrides";
import atlasSlices from "../assets/interior/atlas_slices.json";

/**
 * Developer tools configuration and types
 */

export type SpriteAtlasEntry = {
  id: string;
  name: string;
  atlasKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nativeW: number;
  nativeH: number;
};

/**
 * Fixed sit footprint in grid cells — ≈ one character standing/sitting tile.
 * Seats are never resized; long furniture (couch) gets multiple sit markers.
 */
export const SIT_SEAT_W_CELLS = 1;
export const SIT_SEAT_H_CELLS = 1;

export type SittingPosition = {
  id: string;
  /** Grid X of the seat’s top-left (furniture-local). */
  x: number;
  /** Grid Y of the seat’s top-left (furniture-local). */
  y: number;
  direction: "left" | "right" | "up" | "down";
};

export type InteractionHotspot = {
  id: string;
  x: number; // Grid X offset
  y: number; // Grid Y offset
  width: number;
  height: number;
  action: string;
  miniGame?: MiniGameType;
};

/** One facing / crop variant of the same furniture SKU. */
export type FurnitureRotation = {
  sprite: FurnitureSprite;
  label: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
  /** Sit seats for this facing only (positions + sit direction). */
  sittingPositions?: SittingPosition[];
};

/** Default sit-facing for a chair crop sprite. */
export function defaultSitDirection(
  sprite: string,
): SittingPosition["direction"] {
  switch (sprite) {
    case "chairLeft":
      return "left";
    case "chairRight":
      return "right";
    case "chairUp":
      return "up";
    case "chairDown":
      return "down";
    default:
      return "down";
  }
}

function cloneSitsForRotation(
  base: SittingPosition[],
  rotSprite: FurnitureSprite,
): SittingPosition[] {
  if (base.length === 0) {
    return [
      {
        id: `sit_${rotSprite}`,
        x: 0,
        y: 0,
        direction: defaultSitDirection(rotSprite),
      },
    ];
  }
  return base.map((s) => ({
    ...s,
    id: `${s.id}_${rotSprite}`,
    direction: isChairSprite(rotSprite)
      ? defaultSitDirection(rotSprite)
      : s.direction,
  }));
}

/**
 * Ensure each rotation has its own sittingPositions, and the item root
 * matches the active rotation’s seats (workstation edits one facing at a time).
 */
export function ensureRotationSittingPositions(
  item: FurnitureItemDefinition,
): FurnitureItemDefinition {
  if (!item.rotations || item.rotations.length === 0) return item;
  let changed = false;
  const rotations = item.rotations.map((rot) => {
    if (rot.sittingPositions && rot.sittingPositions.length > 0) return rot;
    changed = true;
    return {
      ...rot,
      sittingPositions: cloneSitsForRotation(item.sittingPositions, rot.sprite),
    };
  });
  if (!changed) return item;
  const active = rotations.find((r) => r.sprite === item.sprite);
  return {
    ...item,
    rotations,
    sittingPositions: active?.sittingPositions ?? item.sittingPositions,
  };
}

export type FurnitureItemDefinition = {
  id: string;
  sprite: FurnitureSprite;
  name: string;
  description: string;
  category: "furniture" | "appliance" | "decoration" | "seating";
  price: number;
  
  // Collision & Physics
  collision: CollisionKind | null;
  anchor: "floor" | "wall";
  gridWidth: number;
  gridHeight: number;
  
  // Interactions
  sittingPositions: SittingPosition[];
  interactionHotspots: InteractionHotspot[];
  
  // Visual / atlas crop (native px in interior atlas)
  spriteAtlasKey?: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
  /** Extra tap-target padding in atlas pixels (applied in edit mode). */
  hitPad?: number;
  /**
   * Alternate facings for one inventory item (e.g. chair ↓←→↑).
   * Active crop in the workstation is the entry matching `sprite`.
   */
  rotations?: FurnitureRotation[];
  /**
   * Visual modes (e.g. TV off / channel A / channel B) — not rotations.
   * Sequence states draw overlay frames on top of the chassis.
   */
  visualStates?: FurnitureVisualState[];
  /** Preview / default state id in DevTools + new placements. */
  activeVisualStateId?: string;
  /** Where the overlay sequence sits on the chassis (atlas px). */
  overlayPlacement?: FurnitureOverlayPlacement;

  // Gameplay
  miniGame?: MiniGameType;
  requiresUnpacking?: boolean;
  /**
   * When true (default), this item appears in the in-game Store.
   * Set false to keep it in DevTools / rooms but hide it from the catalog.
   */
  sellableInStore?: boolean;
  /**
   * Manual Items / Store tab. When set, overrides auto classification
   * (wallDecor / tiles → housing, else furniture).
   */
  catalogGroup?: "furniture" | "housing";

  // Metadata
  createdAt: number;
  updatedAt: number;
};

export type RoomTemplate = {
  id: string;
  name: string;
  description: string;
  furniture: Array<{
    itemId: string;
    gx: number;
    gy: number;
    flipped?: boolean;
  }>;
  windows: Array<{
    gx: number;
    gy: number;
    w: number;
    h: number;
  }>;
  floorTiles: Record<string, string>;
  wallTiles: Record<string, string>;
  expansionsLeft: number;
  expansionsRight: number;
  createdAt: number;
  updatedAt: number;
};

export type DevToolsState = {
  furnitureItems: FurnitureItemDefinition[];
  roomTemplates: RoomTemplate[];
  spriteAtlas: SpriteAtlasEntry[];
  /**
   * Editable atlas crops used as overlay animation frames (TV screens, etc.).
   * Managed in the Overlay frames DevTools tab — not placeable furniture.
   */
  overlayFrames: OverlayFrameDefinition[];
  /**
   * Catalog item ids (`catalog_*`) removed by the user.
   * Load catalog will not recreate these.
   */
  deletedCatalogIds: string[];
};

/** Native size of apps/mobile/assets/interior/interior_free.png */
export const INTERIOR_ATLAS_W = 160;
export const INTERIOR_ATLAS_H = 80;

// Storage keys
const DEVTOOLS_FURNITURE_KEY = "pixelroom.devtools.furniture";
const DEVTOOLS_ROOMS_KEY = "pixelroom.devtools.rooms";
const DEVTOOLS_SPRITES_KEY = "pixelroom.devtools.sprites";
const DEVTOOLS_DELETED_KEY = "pixelroom.devtools.deletedCatalog";

/**
 * Load dev tools state from localStorage
 */
export function loadDevToolsState(): DevToolsState {
  if (typeof localStorage === "undefined") {
    return {
      furnitureItems: [],
      roomTemplates: [],
      spriteAtlas: [],
      overlayFrames: [],
      deletedCatalogIds: [],
    };
  }

  try {
    const furnitureItems = JSON.parse(
      localStorage.getItem(DEVTOOLS_FURNITURE_KEY) ?? "[]",
    );
    const roomTemplates = JSON.parse(
      localStorage.getItem(DEVTOOLS_ROOMS_KEY) ?? "[]",
    );
    const spriteAtlas = JSON.parse(
      localStorage.getItem(DEVTOOLS_SPRITES_KEY) ?? "[]",
    );
    const deletedCatalogIds = JSON.parse(
      localStorage.getItem(DEVTOOLS_DELETED_KEY) ?? "[]",
    );
    const overlayFrames = loadOverlayFrames();

    return {
      furnitureItems: Array.isArray(furnitureItems)
        ? furnitureItems.map((item: FurnitureItemDefinition) =>
            ensureRotationSittingPositions(item),
          )
        : [],
      roomTemplates,
      spriteAtlas,
      overlayFrames,
      deletedCatalogIds: Array.isArray(deletedCatalogIds)
        ? deletedCatalogIds.filter((id) => typeof id === "string")
        : [],
    };
  } catch {
    return {
      furnitureItems: [],
      roomTemplates: [],
      spriteAtlas: [],
      overlayFrames: [],
      deletedCatalogIds: [],
    };
  }
}

/**
 * Save dev tools state to localStorage
 */
export function saveDevToolsState(state: Partial<DevToolsState>) {
  if (typeof localStorage === "undefined") return;

  try {
    if (state.furnitureItems) {
      localStorage.setItem(
        DEVTOOLS_FURNITURE_KEY,
        JSON.stringify(state.furnitureItems),
      );
      invalidateSpriteOverrides();
    }
    if (state.roomTemplates) {
      localStorage.setItem(
        DEVTOOLS_ROOMS_KEY,
        JSON.stringify(state.roomTemplates),
      );
    }
    if (state.spriteAtlas) {
      localStorage.setItem(
        DEVTOOLS_SPRITES_KEY,
        JSON.stringify(state.spriteAtlas),
      );
    }
    if (state.overlayFrames) {
      saveOverlayFrames(state.overlayFrames);
      invalidateOverlayFrameCache();
    }
    if (state.deletedCatalogIds) {
      localStorage.setItem(
        DEVTOOLS_DELETED_KEY,
        JSON.stringify(state.deletedCatalogIds),
      );
    }
  } catch (error) {
    console.error("Failed to save dev tools state:", error);
  }
}

/** Remove a furniture item; tombstone catalog_* so seed won't restore it. */
export function deleteFurnitureItem(
  state: DevToolsState,
  itemId: string,
): DevToolsState {
  const item = state.furnitureItems.find((i) => i.id === itemId);
  const furnitureItems = state.furnitureItems.filter((i) => i.id !== itemId);
  let deletedCatalogIds = state.deletedCatalogIds ?? [];
  if (item?.id.startsWith("catalog_") && !deletedCatalogIds.includes(item.id)) {
    deletedCatalogIds = [...deletedCatalogIds, item.id];
  }
  return { ...state, furnitureItems, deletedCatalogIds };
}

/** atlas_slices.json key → FurnitureSprite id */
const ATLAS_KEY_TO_SPRITE: Record<string, FurnitureSprite> = {
  chair_down: "chairDown",
  chair_up: "chairUp",
  chair_left: "chairLeft",
  chair_right: "chairRight",
  wall_stripe: "wallStripe",
  wall_stripe_base: "wallStripeBase",
  wall_white: "wallWhite",
  wall_orange: "wallOrange",
  floor_wood: "floorWood",
  poster_sw: "posterSw",
  poster_face: "posterFace",
  side_table: "sideTable",
  armchair: "sideTable",
  wall_art: "wallArt",
  table: "table",
  sofa: "table",
  bed: "bed",
  nightstand: "nightstand",
  rug: "rug",
  tv: "tv",
  appliance: "appliance",
  plant: "plant",
  candle: "candle",
  shelf: "shelf",
  floor: "floor",
  tv_screen_0: "tvScreen0",
  tv_screen_1: "tvScreen1",
  tv_screen_2: "tvScreen2",
  tv_screen_3: "tvScreen3",
  tv_screen_4: "tvScreen4",
  tv_screen_5: "tvScreen5",
  tv_screen_6: "tvScreen6",
  tv_screen_7: "tvScreen7",
};

const CHAIR_ROT_LABEL: Record<string, string> = {
  chairDown: "↓",
  chairLeft: "←",
  chairRight: "→",
  chairUp: "↑",
};

function buildChairRotations(
  slices: Record<string, { x: number; y: number; w: number; h: number }>,
): FurnitureRotation[] {
  return CHAIR_ROTATIONS.map((sprite) => {
    const atlasKey =
      Object.entries(ATLAS_KEY_TO_SPRITE).find(([, sp]) => sp === sprite)?.[0] ??
      sprite;
    const slice = slices[atlasKey];
    const meta = SPRITE_CATALOG.find((s) => s.id === sprite);
    return {
      sprite,
      label: CHAIR_ROT_LABEL[sprite] ?? sprite,
      spriteX: slice?.x ?? 0,
      spriteY: slice?.y ?? 0,
      spriteWidth: slice?.w ?? meta?.nativeW ?? 16,
      spriteHeight: slice?.h ?? meta?.nativeH ?? 16,
      sittingPositions: [
        {
          id: `sit_${sprite}`,
          x: 0,
          y: 0,
          direction: defaultSitDirection(sprite),
        },
      ],
    };
  });
}

/** Keep spriteAtlas entry in sync when a furniture crop changes. */
export function syncAtlasEntryFromFurniture(
  atlas: SpriteAtlasEntry[],
  item: FurnitureItemDefinition,
): SpriteAtlasEntry[] {
  const key =
    Object.entries(ATLAS_KEY_TO_SPRITE).find(([, sp]) => sp === item.sprite)?.[0] ??
    item.sprite;
  const id = `atlas_${key}`;
  const x = item.spriteX ?? 0;
  const y = item.spriteY ?? 0;
  const width = item.spriteWidth ?? 16;
  const height = item.spriteHeight ?? 16;
  const existing = atlas.find((s) => s.id === id || s.name === key);
  if (existing) {
    return atlas.map((s) =>
      s.id === existing.id
        ? {
            ...s,
            name: key,
            atlasKey: item.spriteAtlasKey ?? "interior_free",
            x,
            y,
            width,
            height,
            nativeW: width,
            nativeH: height,
          }
        : s,
    );
  }
  return [
    ...atlas,
    {
      id,
      name: key,
      atlasKey: item.spriteAtlasKey ?? "interior_free",
      x,
      y,
      width,
      height,
      nativeW: width,
      nativeH: height,
    },
  ];
}

/**
 * Seed DevTools with every in-game furniture sprite + atlas crop data so
 * existing pieces can be tuned (cuts, hitpads, sitting spots).
 */
export function seedGameCatalog(existing: DevToolsState): DevToolsState {
  const now = Date.now();
  const tombstoned = new Set(existing.deletedCatalogIds ?? []);
  const bySprite = new Map(
    existing.furnitureItems
      .filter((i) => i.id.startsWith("catalog_"))
      .map((i) => [i.sprite, i]),
  );

  const slices = (atlasSlices as { slices: Record<string, { x: number; y: number; w: number; h: number }> })
    .slices;

  // Drop legacy per-facing chair catalog rows (now rotations on catalog_chairDown).
  let furnitureItems: FurnitureItemDefinition[] = existing.furnitureItems.filter(
    (i) =>
      !(
        i.id.startsWith("catalog_") &&
        isChairSprite(i.sprite) &&
        i.sprite !== "chairDown"
      ),
  );
  for (const meta of SPRITE_CATALOG) {
    // Include floor tiles + wall brushes + placeables (housing + furniture).
    // Chair facings are rotations on catalog_chairDown — not separate SKUs.
    if (isChairSprite(meta.id) && meta.id !== "chairDown") continue;
    // TV screen frames are overlays on catalog_tv — not separate SKUs.
    if (meta.overlayFrame || isTvScreenSprite(meta.id)) continue;
    const catalogId = `catalog_${meta.id}`;
    if (tombstoned.has(catalogId)) continue;
    const inv = INVENTORY_CATALOG.find((c) => c.sprite === meta.id);
    const atlasKey =
      Object.entries(ATLAS_KEY_TO_SPRITE).find(([, sp]) => sp === meta.id)?.[0] ??
      meta.id;
    const slice = slices[atlasKey];
    const prev = bySprite.get(meta.id);
    if (prev) {
      const idx = furnitureItems.findIndex((i) => i.id === prev.id);
      if (idx < 0) continue;
      let next = prev;
      // Backfill chair rotations on older catalog rows.
      if (
        meta.id === "chairDown" &&
        (!prev.rotations || prev.rotations.length === 0)
      ) {
        next = {
          ...prev,
          name: "Chair",
          rotations: buildChairRotations(slices),
          updatedAt: now,
        };
      }
      // Backfill TV visual states + overlay placement (channel A/B sequences).
      if (meta.id === "tv") {
        const needsStates =
          !prev.visualStates?.length ||
          !prev.visualStates.some((s) => s.id === "channelB");
        if (needsStates || !prev.overlayPlacement) {
          next = {
            ...next,
            name: "TV",
            description: "TV with Off / Channel A / Channel B screen states",
            visualStates: needsStates
              ? buildTvVisualStates()
              : next.visualStates,
            activeVisualStateId: next.activeVisualStateId ?? "channelA",
            overlayPlacement: next.overlayPlacement ?? DEFAULT_TV_OVERLAY,
            miniGame: next.miniGame ?? "tv",
            updatedAt: now,
          };
        }
      }
      // Per-rotation sit facing (and seats) for items that still share one list.
      const withSits = ensureRotationSittingPositions(next);
      if (withSits !== next || next !== prev) {
        furnitureItems[idx] = { ...withSits, updatedAt: now };
      }
      continue;
    }

    const isSeat = collisionForSprite(meta.id) === "seat";
    const rotations =
      meta.id === "chairDown" ? buildChairRotations(slices) : undefined;
    const visualStates =
      meta.id === "tv" ? buildTvVisualStates() : undefined;
    furnitureItems.push({
      id: catalogId,
      sprite: meta.id,
      name:
        meta.id === "chairDown"
          ? "Chair"
          : meta.id === "tv"
            ? "TV"
            : (inv?.name ?? meta.label),
      description:
        meta.id === "chairDown"
          ? "Chair with ↓ ← → ↑ rotations (game catalog)"
          : meta.id === "tv"
            ? "TV with Off / Channel A / Channel B screen states"
            : `${meta.label} (game catalog)`,
      category: isSeat
        ? "seating"
        : meta.defaultAnchor === "wall"
          ? "decoration"
          : "furniture",
      price: inv?.price ?? 0,
      collision: collisionForSprite(meta.id),
      anchor: meta.defaultAnchor,
      gridWidth: Math.max(1, Math.round(meta.nativeW / GRID_CELL)),
      gridHeight: Math.max(1, Math.round(meta.nativeH / GRID_CELL)),
      sittingPositions: isSeat
        ? rotations?.find((r) => r.sprite === meta.id)?.sittingPositions ?? [
            {
              id: `sit_${meta.id}`,
              x: 0,
              y: 0,
              direction: defaultSitDirection(meta.id),
            },
          ]
        : [],
      interactionHotspots: [],
      spriteAtlasKey: "interior_free",
      // Composite pieces (TV) use x/y = -1 in the atlas manifest.
      spriteX: slice && slice.x >= 0 ? slice.x : 0,
      spriteY: slice && slice.y >= 0 ? slice.y : 0,
      spriteWidth: slice?.w ?? meta.nativeW,
      spriteHeight: slice?.h ?? meta.nativeH,
      hitPad: 0,
      rotations,
      visualStates,
      activeVisualStateId: meta.id === "tv" ? "channelA" : undefined,
      overlayPlacement: meta.id === "tv" ? DEFAULT_TV_OVERLAY : undefined,
      miniGame: meta.id === "tv" ? "tv" : undefined,
      requiresUnpacking: true,
      sellableInStore: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Drop legacy standalone TV screen catalog rows (now overlays on catalog_tv).
  furnitureItems = furnitureItems.filter(
    (i) => !(i.id.startsWith("catalog_") && isTvScreenSprite(i.sprite)),
  );

  const spriteAtlas: SpriteAtlasEntry[] = [...existing.spriteAtlas];
  const haveAtlas = new Set(spriteAtlas.map((s) => s.id));
  for (const [key, slice] of Object.entries(slices)) {
    const id = `atlas_${key}`;
    if (haveAtlas.has(id)) continue;
    spriteAtlas.push({
      id,
      name: key,
      atlasKey: "interior_free",
      x: slice.x,
      y: slice.y,
      width: slice.w,
      height: slice.h,
      nativeW: slice.w,
      nativeH: slice.h,
    });
  }

  const overlayFrames = seedOverlayFramesFromAtlas(
    existing.overlayFrames?.length
      ? existing.overlayFrames
      : loadOverlayFrames(),
  );
  saveOverlayFrames(overlayFrames);
  invalidateOverlayFrameCache();

  return { ...existing, furnitureItems, spriteAtlas, overlayFrames };
}

/**
 * Export dev tools state as JSON
 */
export function exportDevToolsState(state: DevToolsState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import dev tools state from JSON
 */
export function importDevToolsState(json: string): DevToolsState | null {
  try {
    const parsed = JSON.parse(json);
    const overlayFrames = Array.isArray(parsed.overlayFrames)
      ? parsed.overlayFrames
      : loadOverlayFrames();
    if (Array.isArray(parsed.overlayFrames)) {
      saveOverlayFrames(parsed.overlayFrames);
      invalidateOverlayFrameCache();
    }
    return {
      furnitureItems: parsed.furnitureItems ?? [],
      roomTemplates: parsed.roomTemplates ?? [],
      spriteAtlas: parsed.spriteAtlas ?? [],
      overlayFrames,
      deletedCatalogIds: Array.isArray(parsed.deletedCatalogIds)
        ? parsed.deletedCatalogIds.filter((id: unknown) => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Create a new furniture item template
 */
export function createFurnitureTemplate(): FurnitureItemDefinition {
  const now = Date.now();
  return {
    id: `custom_${now}`,
    sprite: "table" as FurnitureSprite,
    name: "New Item",
    description: "Custom furniture item",
    category: "furniture",
    price: 50,
    collision: "solid",
    anchor: "floor",
    gridWidth: 2,
    gridHeight: 1,
    sittingPositions: [],
    interactionHotspots: [],
    spriteAtlasKey: "interior",
    spriteX: 0,
    spriteY: 0,
    spriteWidth: 16,
    spriteHeight: 16,
    sellableInStore: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new room template
 */
export function createRoomTemplate(): RoomTemplate {
  const now = Date.now();
  return {
    id: `room_${now}`,
    name: "New Room",
    description: "Custom room layout",
    furniture: [],
    windows: [],
    floorTiles: {},
    wallTiles: {},
    expansionsLeft: 0,
    expansionsRight: 0,
    createdAt: now,
    updatedAt: now,
  };
}
