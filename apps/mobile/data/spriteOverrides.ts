import type { FurnitureSprite } from "./roomLayout";
import type {
  InteractionHotspot,
  SittingPosition,
} from "./devTools";
import type { CollisionKind } from "./inventory";
import type { MiniGameType } from "./minigames";
import type {
  FurnitureOverlayPlacement,
  FurnitureVisualState,
} from "./furnitureVisual";
import {
  buildTvVisualStates,
  DEFAULT_TV_OVERLAY,
  findVisualState,
} from "./furnitureVisual";

export type StoredFurniture = {
  id: string;
  sprite: FurnitureSprite;
  name?: string;
  price?: number;
  spriteAtlasKey?: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
  gridWidth?: number;
  gridHeight?: number;
  hitPad?: number;
  collision?: CollisionKind | null;
  sittingPositions?: SittingPosition[];
  interactionHotspots?: InteractionHotspot[];
  miniGame?: MiniGameType;
  updatedAt?: number;
  visualStates?: FurnitureVisualState[];
  activeVisualStateId?: string;
  overlayPlacement?: FurnitureOverlayPlacement;
  /** Present on DevTools catalog rows that share one SKU across facings. */
  rotations?: Array<{
    sprite: FurnitureSprite;
    spriteX?: number;
    spriteY?: number;
    spriteWidth?: number;
    spriteHeight?: number;
    sittingPositions?: SittingPosition[];
    interactionHotspots?: InteractionHotspot[];
  }>;
};

const STORAGE_KEY = "pixelroom.devtools.furniture";

let cache: Map<FurnitureSprite, StoredFurniture> | null = null;

/** Call after DevTools saves furniture so the room picks up new sizes/hitboxes. */
export function invalidateSpriteOverrides() {
  cache = null;
}

function loadOverrides(): Map<FurnitureSprite, StoredFurniture> {
  if (cache) return cache;
  cache = new Map();
  if (typeof localStorage === "undefined") return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredFurniture[];
    if (!Array.isArray(raw)) return cache;
    // Prefer catalog_* entries, then newest updatedAt for a sprite.
    const ranked = [...raw].sort(
      (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
    );
    for (const item of ranked) {
      if (!item?.sprite) continue;
      cache.set(item.sprite, item);
      // Rotations are separate placed sprites — each needs its own seats/facing.
      if (!item.rotations?.length) continue;
      for (const rot of item.rotations) {
        if (!rot?.sprite) continue;
        cache.set(rot.sprite, {
          ...item,
          sprite: rot.sprite,
          spriteX: rot.spriteX ?? item.spriteX,
          spriteY: rot.spriteY ?? item.spriteY,
          spriteWidth: rot.spriteWidth ?? item.spriteWidth,
          spriteHeight: rot.spriteHeight ?? item.spriteHeight,
          sittingPositions: rot.sittingPositions ?? item.sittingPositions,
          interactionHotspots:
            rot.interactionHotspots ?? item.interactionHotspots,
        });
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return cache;
}

export function furnitureOverride(
  sprite: FurnitureSprite,
): StoredFurniture | null {
  return loadOverrides().get(sprite) ?? null;
}

/** Atlas crop from DevTools for a placed / store sprite, if edited. */
export function cropOverride(sprite: FurnitureSprite): {
  atlasKey?: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
} | null {
  const ov = furnitureOverride(sprite);
  if (!ov) return null;
  if (
    ov.spriteWidth == null ||
    ov.spriteHeight == null ||
    ov.spriteWidth <= 0 ||
    ov.spriteHeight <= 0
  ) {
    return null;
  }
  // Require an explicit crop origin OR non-default size so untouched rows
  // can still fall back to piece PNGs when desired — but seeded catalog
  // always has spriteX/Y from atlas_slices, so crops win after Load catalog.
  if (ov.spriteX == null && ov.spriteY == null) return null;
  return {
    atlasKey: ov.spriteAtlasKey ?? "interior",
    spriteX: ov.spriteX ?? 0,
    spriteY: ov.spriteY ?? 0,
    spriteWidth: ov.spriteWidth,
    spriteHeight: ov.spriteHeight,
  };
}

/** Native pixel size after DevTools cut overrides (falls back to catalog). */
export function effectiveNativeSize(
  sprite: FurnitureSprite,
  fallbackW: number,
  fallbackH: number,
): { w: number; h: number } {
  const ov = furnitureOverride(sprite);
  return {
    w: ov?.spriteWidth && ov.spriteWidth > 0 ? ov.spriteWidth : fallbackW,
    h: ov?.spriteHeight && ov.spriteHeight > 0 ? ov.spriteHeight : fallbackH,
  };
}

/** Extra tap padding in screen px from DevTools hitPad (atlas units × scale). */
export function overrideHitPad(sprite: FurnitureSprite, cellPx: number): number {
  const ov = furnitureOverride(sprite);
  if (ov?.hitPad == null || ov.hitPad <= 0) return 0;
  return (ov.hitPad / 16) * cellPx;
}

/** DevTools sit offsets keyed by sprite id (grid cells from furniture origin). */
export function seatOffsetsBySprite(): Record<
  string,
  Array<{ x: number; y: number; facing?: SittingPosition["direction"] }>
> {
  const out: Record<
    string,
    Array<{ x: number; y: number; facing?: SittingPosition["direction"] }>
  > = {};
  for (const item of loadOverrides().values()) {
    const sits = item.sittingPositions ?? [];
    if (sits.length === 0) continue;
    out[item.sprite] = sits.map((s) => ({
      x: s.x,
      y: s.y,
      facing: s.direction,
    }));
  }
  return out;
}

export function overrideSittingPositions(
  sprite: FurnitureSprite,
): SittingPosition[] {
  return furnitureOverride(sprite)?.sittingPositions ?? [];
}

export function overrideInteractionHotspots(
  sprite: FurnitureSprite,
): InteractionHotspot[] {
  return furnitureOverride(sprite)?.interactionHotspots ?? [];
}

export function overrideVisualStates(
  sprite: FurnitureSprite,
): FurnitureVisualState[] {
  const fromStore = furnitureOverride(sprite)?.visualStates;
  if (fromStore?.length) return fromStore;
  return sprite === "tv" ? buildTvVisualStates() : [];
}

export function overrideOverlayPlacement(
  sprite: FurnitureSprite,
): FurnitureOverlayPlacement | null {
  return (
    furnitureOverride(sprite)?.overlayPlacement ??
    (sprite === "tv" ? DEFAULT_TV_OVERLAY : null)
  );
}

export function overrideActiveVisualStateId(
  sprite: FurnitureSprite,
): string | undefined {
  return (
    furnitureOverride(sprite)?.activeVisualStateId ??
    (sprite === "tv" ? "channelA" : undefined)
  );
}

/** Resolve which visual state a placed piece should show. */
export function resolveVisualState(
  sprite: FurnitureSprite,
  placedStateId?: string,
): FurnitureVisualState | undefined {
  return findVisualState(
    overrideVisualStates(sprite),
    placedStateId ?? overrideActiveVisualStateId(sprite),
  );
}
