/**
 * Asset catalog + appearance options.
 * Primary kit: cozy "char free" layered sheet (warmer than nude bases).
 * Alternate: clothed sheets from images.zip for quick presets.
 */

export const COZY_SHEET = {
  source: require("../assets/characters/char_free/global.png") as number,
  width: 256,
  height: 384,
  frame: 32,
  cols: 8,
  /** Pair-start rows (0-based). Facing left uses row+1. */
  rows: {
    body: 0,
    hair: 2,
    shirt: 4,
    pantsBlue: 6,
    shoes: 8,
    /** Purple hat (was mislabeled as pants). */
    hat: 10,
  },
} as const;

export const SHEET_PRESETS = [
  { id: "50", source: require("../assets/characters/50.png") as number, label: "Sunny" },
  { id: "80", source: require("../assets/characters/80.png") as number, label: "Mint" },
  { id: "120", source: require("../assets/characters/120.png") as number, label: "Violet" },
  { id: "200", source: require("../assets/characters/200.png") as number, label: "Coral" },
  { id: "250", source: require("../assets/characters/250.png") as number, label: "Sky" },
  { id: "300", source: require("../assets/characters/300.png") as number, label: "Rose" },
] as const;

/** Full sheet is 48×68 → 12×17 frames in a 4×4 grid. */
export const SHEET_SIZE = { width: 48, height: 68, frameW: 12, frameH: 17, cols: 4, rows: 4 } as const;

export type CharKit = "cozy" | "sheet";

export const FURNITURE = {
  table: require("../assets/interior/pieces/sofa.png") as number,
  sideTable: require("../assets/interior/pieces/armchair.png") as number,
  bed: require("../assets/interior/pieces/bed.png") as number,
  chairDown: require("../assets/interior/pieces/chair_down.png") as number,
  chairLeft: require("../assets/interior/pieces/chair_left.png") as number,
  chairRight: require("../assets/interior/pieces/chair_right.png") as number,
  chairUp: require("../assets/interior/pieces/chair_up.png") as number,
  nightstand: require("../assets/interior/pieces/nightstand.png") as number,
  plant: require("../assets/interior/pieces/plant.png") as number,
  rug: require("../assets/interior/pieces/rug.png") as number,
  /** Cook station (reuses TV art until a dedicated stove asset exists). */
  appliance: require("../assets/interior/pieces/appliance.png") as number,
  tv: require("../assets/interior/pieces/tv.png") as number,
  wallArt: require("../assets/interior/pieces/wall_a.png") as number,
  wallStripe: require("../assets/interior/pieces/wall_stripe.png") as number,
  wallOrange: require("../assets/interior/pieces/wall_orange.png") as number,
  wallWhite: require("../assets/interior/pieces/wall_white.png") as number,
  wallStripeBase: require("../assets/interior/pieces/wall_stripe_base.png") as number,
  wallOrangeBase: require("../assets/interior/pieces/wall_orange_base.png") as number,
  wallWhiteBase: require("../assets/interior/pieces/wall_white_base.png") as number,
  posterSw: require("../assets/interior/pieces/poster_sw.png") as number,
  posterFace: require("../assets/interior/pieces/poster_face.png") as number,
  floor: require("../assets/interior/pieces/floor.png") as number,
  floorWood: require("../assets/interior/pieces/floor_wood.png") as number,
  candle: require("../assets/interior/pieces/candle.png") as number,
  shelf: require("../assets/interior/pieces/shelf.png") as number,
  tvScreen0: require("../assets/interior/pieces/tv_screen_0.png") as number,
  tvScreen1: require("../assets/interior/pieces/tv_screen_1.png") as number,
  tvScreen2: require("../assets/interior/pieces/tv_screen_2.png") as number,
  tvScreen3: require("../assets/interior/pieces/tv_screen_3.png") as number,
} as const;

export const FOOD = {
  burger: require("../assets/props/food/15_burger.png") as number,
  bread: require("../assets/props/food/07_bread.png") as number,
  curry: require("../assets/props/food/32_curry.png") as number,
  burgerDish: require("../assets/props/food/16_burger_dish.png") as number,
} as const;

/** images.zip rows: 0 down, 1 right, 2 left, 3 up */
export function sheetDirRow(facing: "left" | "right"): number {
  return facing === "left" ? 2 : 1;
}

export function sheetSourceForId(sheetId: string): number {
  const found = SHEET_PRESETS.find((p) => p.id === sheetId);
  return found?.source ?? SHEET_PRESETS[0].source;
}
