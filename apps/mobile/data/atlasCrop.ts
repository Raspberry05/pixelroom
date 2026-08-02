import { Image, type ImageSourcePropType } from "react-native";
import atlasSlices from "../assets/interior/atlas_slices.json";
import {
  INTERIOR_ATLAS_H,
  INTERIOR_ATLAS_W,
  type FurnitureItemDefinition,
} from "./devTools";
import { SPRITE_BY_ID, type FurnitureSprite } from "./roomLayout";
import { COZY_SHEET, FOOD, SHEET_PRESETS, SHEET_SIZE } from "./sprites";

/** FurnitureSprite → atlas_slices.json key */
const SPRITE_TO_SLICE_KEY: Partial<Record<FurnitureSprite | "window", string>> = {
  chairDown: "chair_down",
  chairUp: "chair_up",
  chairLeft: "chair_left",
  chairRight: "chair_right",
  wallStripe: "wall_stripe",
  wallStripeBase: "wall_stripe_base",
  wallWhite: "wall_white",
  wallOrange: "wall_orange",
  floorWood: "floor_wood",
  floor: "floor",
  posterSw: "poster_sw",
  posterFace: "poster_face",
  sideTable: "side_table",
  wallArt: "wall_art",
  table: "table",
  bed: "bed",
  nightstand: "nightstand",
  rug: "rug",
  tv: "tv",
  appliance: "appliance",
  plant: "plant",
  candle: "candle",
  shelf: "shelf",
  window: "wall_art",
};

/** Shared crop fields for grocery / clothes / dishes DevTools rows. */
export type AtlasCropFields = {
  /** Pack id — see `resolveAtlasPack`. Default "interior". */
  atlasKey?: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
};

export type ResolvedAtlasPack = {
  id: string;
  label: string;
  source: ImageSourcePropType;
  width: number;
  height: number;
};

const INTERIOR_SRC = require("../assets/interior/interior_free.png");

function assetSize(
  source: number,
  fallbackW: number,
  fallbackH: number,
): { width: number; height: number } {
  try {
    const resolved = Image.resolveAssetSource(source);
    if (resolved?.width && resolved?.height) {
      return { width: resolved.width, height: resolved.height };
    }
  } catch {
    // ignore
  }
  return { width: fallbackW, height: fallbackH };
}

/** Atlases / sheets available in the crop workstation. */
export function listAtlasPacks(): ResolvedAtlasPack[] {
  const packs: ResolvedAtlasPack[] = [
    {
      id: "interior",
      label: "Interior atlas",
      source: INTERIOR_SRC,
      width: INTERIOR_ATLAS_W,
      height: INTERIOR_ATLAS_H,
    },
    {
      id: "cozy",
      label: "Cozy character sheet",
      source: COZY_SHEET.source,
      width: COZY_SHEET.width,
      height: COZY_SHEET.height,
    },
  ];

  for (const preset of SHEET_PRESETS) {
    packs.push({
      id: `sheet:${preset.id}`,
      label: `Sheet · ${preset.label}`,
      source: preset.source,
      width: SHEET_SIZE.width,
      height: SHEET_SIZE.height,
    });
  }

  for (const [key, source] of Object.entries(FOOD)) {
    const size = assetSize(source, 32, 32);
    packs.push({
      id: `food:${key}`,
      label: `Food · ${key}`,
      source,
      width: size.width,
      height: size.height,
    });
  }

  return packs;
}

export function resolveAtlasPack(atlasKey?: string): ResolvedAtlasPack {
  const packs = listAtlasPacks();
  const found = packs.find((p) => p.id === (atlasKey || "interior"));
  return found ?? packs[0]!;
}

/** Default atlas for clothes based on outfit sourceKey. */
export function defaultClothAtlasKey(sourceKey: string): string {
  if (sourceKey === "cozy") return "cozy";
  if (SHEET_PRESETS.some((p) => p.id === sourceKey)) return `sheet:${sourceKey}`;
  return "cozy";
}

export function cropAsFurnitureItem(
  id: string,
  name: string,
  crop: AtlasCropFields,
): FurnitureItemDefinition {
  const pack = resolveAtlasPack(crop.atlasKey);
  const now = Date.now();
  return {
    id,
    sprite: "plant",
    name,
    description: "Catalog crop",
    category: "decoration",
    price: 0,
    collision: null,
    anchor: "floor",
    gridWidth: 1,
    gridHeight: 1,
    sittingPositions: [],
    interactionHotspots: [],
    spriteAtlasKey: pack.id,
    spriteX: crop.spriteX ?? 0,
    spriteY: crop.spriteY ?? 0,
    spriteWidth: crop.spriteWidth ?? Math.min(16, pack.width),
    spriteHeight: crop.spriteHeight ?? Math.min(16, pack.height),
    sellableInStore: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function pickCropUpdates(
  updates: Partial<FurnitureItemDefinition>,
): Partial<AtlasCropFields> {
  const next: Partial<AtlasCropFields> = {};
  if (updates.spriteX != null) next.spriteX = updates.spriteX;
  if (updates.spriteY != null) next.spriteY = updates.spriteY;
  if (updates.spriteWidth != null) next.spriteWidth = updates.spriteWidth;
  if (updates.spriteHeight != null) next.spriteHeight = updates.spriteHeight;
  return next;
}

export function hasAtlasCrop(crop: AtlasCropFields | null | undefined): boolean {
  if (!crop) return false;
  return (
    crop.spriteWidth != null &&
    crop.spriteHeight != null &&
    crop.spriteWidth > 0 &&
    crop.spriteHeight > 0
  );
}

/** Default interior-atlas crop for a sprite (from atlas_slices.json). */
export function defaultInteriorCropForSprite(
  sprite: FurnitureSprite | "window",
): AtlasCropFields {
  const slices = (
    atlasSlices as { slices: Record<string, { x: number; y: number; w: number; h: number }> }
  ).slices;
  const key = SPRITE_TO_SLICE_KEY[sprite];
  const slice = key ? slices[key] : undefined;
  if (slice) {
    return {
      atlasKey: "interior",
      spriteX: slice.x,
      spriteY: slice.y,
      spriteWidth: slice.w,
      spriteHeight: slice.h,
    };
  }
  const meta =
    sprite !== "window" ? SPRITE_BY_ID[sprite as FurnitureSprite] : undefined;
  return {
    atlasKey: "interior",
    spriteX: 0,
    spriteY: 0,
    spriteWidth: meta?.nativeW ?? 16,
    spriteHeight: meta?.nativeH ?? 16,
  };
}
