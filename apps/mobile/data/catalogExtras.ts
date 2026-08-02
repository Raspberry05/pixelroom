import { GROCERY_ITEMS, type GroceryItem } from "./groceryItems";
import {
  INVENTORY_CATALOG,
  type InventoryItemDef,
  type InventoryItemId,
} from "./inventory";
import { RECIPES } from "./recipes";
import {
  type AtlasCropFields,
  defaultClothAtlasKey,
  defaultInteriorCropForSprite,
  hasAtlasCrop,
  resolveAtlasPack,
} from "./atlasCrop";
import type { FurnitureSprite } from "./roomLayout";
import { COZY_SHEET, SHEET_PRESETS } from "./sprites";
import type { Appearance } from "@pixelroom/core";
import type { ImageSourcePropType } from "react-native";

const GROCERY_KEY = "pixelroom.devtools.grocery";
const CLOTH_KEY = "pixelroom.devtools.clothes";
const HOUSING_SKU_KEY = "pixelroom.devtools.housingSkus";
const DISHES_KEY = "pixelroom.devtools.dishes";

/** Grocery row editable in DevTools (extends store grocery). */
export type DevToolsGroceryItem = GroceryItem &
  AtlasCropFields & {
    sellableInStore?: boolean;
    updatedAt?: number;
  };

/** Clothes row editable in DevTools. */
export type DevToolsClothItem = AtlasCropFields & {
  id: string;
  name: string;
  price: number;
  sellableInStore?: boolean;
  patch: Partial<Appearance>;
  /** "cozy" or a SHEET_PRESETS id */
  sourceKey: string;
  updatedAt?: number;
};

export type DevToolsHousingSku = AtlasCropFields & {
  id: InventoryItemId;
  name: string;
  price: number;
  sellableInStore?: boolean;
  kind: InventoryItemDef["kind"];
  sprite: InventoryItemDef["sprite"];
  collision: InventoryItemDef["collision"];
  updatedAt?: number;
};

/** Cooked / recipe end-result dishes (DevTools + cooking UI). */
export type DevToolsDishItem = AtlasCropFields & {
  id: string;
  /** Linked recipe id when seeded from RECIPES. */
  recipeId: string | null;
  name: string;
  emoji: string;
  description: string;
  price?: number;
  sellableInStore?: boolean;
  updatedAt?: number;
};

export type ClothStoreListing = {
  id: string;
  name: string;
  price: number;
  patch: Partial<Appearance>;
  source: ImageSourcePropType;
  crop?: AtlasCropFields;
};

export type GroceryStoreListing = GroceryItem & {
  crop?: AtlasCropFields;
};

export type DishStoreListing = {
  id: string;
  recipeId: string | null;
  name: string;
  emoji: string;
  description: string;
  price: number;
  crop?: AtlasCropFields;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    return raw == null ? fallback : (raw as T);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultClothCrop(sourceKey: string): AtlasCropFields {
  const atlasKey = defaultClothAtlasKey(sourceKey);
  const pack = resolveAtlasPack(atlasKey);
  if (atlasKey === "cozy") {
    return {
      atlasKey,
      spriteX: 0,
      spriteY: COZY_SHEET.rows.shirt * COZY_SHEET.frame,
      spriteWidth: COZY_SHEET.frame,
      spriteHeight: COZY_SHEET.frame,
    };
  }
  return {
    atlasKey,
    spriteX: 0,
    spriteY: 0,
    spriteWidth: Math.min(12, pack.width),
    spriteHeight: Math.min(17, pack.height),
  };
}

function defaultClothCatalog(): DevToolsClothItem[] {
  return [
    {
      id: "cloth_red_tee",
      name: "Red tee",
      price: 40,
      sellableInStore: true,
      patch: { kit: "cozy", outfit: "red" },
      sourceKey: "cozy",
      ...defaultClothCrop("cozy"),
    },
    {
      id: "cloth_blue_pants",
      name: "Blue pants",
      price: 35,
      sellableInStore: true,
      patch: { kit: "cozy", pants: "blue" },
      sourceKey: "cozy",
      atlasKey: "cozy",
      spriteX: 0,
      spriteY: COZY_SHEET.rows.pantsBlue * COZY_SHEET.frame,
      spriteWidth: COZY_SHEET.frame,
      spriteHeight: COZY_SHEET.frame,
    },
    {
      id: "cloth_purple_hat",
      name: "Purple hat",
      price: 45,
      sellableInStore: true,
      patch: { kit: "cozy", accessory: "purple" },
      sourceKey: "cozy",
      atlasKey: "cozy",
      spriteX: 0,
      spriteY: COZY_SHEET.rows.hat * COZY_SHEET.frame,
      spriteWidth: COZY_SHEET.frame,
      spriteHeight: COZY_SHEET.frame,
    },
    ...SHEET_PRESETS.map((preset, index) => ({
      id: `cloth_sheet_${preset.id}`,
      name: `${preset.label} look`,
      price: 90 + index * 15,
      sellableInStore: true,
      patch: { kit: "sheet" as const, sheetId: preset.id },
      sourceKey: preset.id,
      ...defaultClothCrop(preset.id),
    })),
  ];
}

/** Suggested food atlas for a few known recipes. */
const DISH_FOOD_ATLAS: Record<string, string> = {
  buttered_toast: "food:bread",
  cheese_sandwich: "food:burger",
  fried_rice: "food:curry",
  spaghetti: "food:curry",
  fruit_salad: "food:burgerDish",
};

function defaultDishCatalog(): DevToolsDishItem[] {
  return RECIPES.map((recipe) => {
    const atlasKey = DISH_FOOD_ATLAS[recipe.id] ?? "interior";
    const pack = resolveAtlasPack(atlasKey);
    const isFood = atlasKey.startsWith("food:");
    return {
      id: `dish_${recipe.id}`,
      recipeId: recipe.id,
      name: recipe.name,
      emoji: recipe.emoji,
      description: recipe.description,
      sellableInStore: false,
      price: 25,
      atlasKey,
      spriteX: 0,
      spriteY: 0,
      spriteWidth: isFood ? pack.width : 16,
      spriteHeight: isFood ? pack.height : 16,
    };
  });
}

function clothSource(sourceKey: string): ImageSourcePropType {
  if (sourceKey === "cozy") return COZY_SHEET.source;
  const preset = SHEET_PRESETS.find((p) => p.id === sourceKey);
  return preset?.source ?? COZY_SHEET.source;
}

function asCrop(item: AtlasCropFields): AtlasCropFields | undefined {
  if (!hasAtlasCrop(item)) return undefined;
  return {
    atlasKey: item.atlasKey,
    spriteX: item.spriteX,
    spriteY: item.spriteY,
    spriteWidth: item.spriteWidth,
    spriteHeight: item.spriteHeight,
  };
}

export function loadGroceryCatalog(): DevToolsGroceryItem[] {
  const saved = readJson<DevToolsGroceryItem[] | null>(GROCERY_KEY, null);
  if (saved && saved.length > 0) {
    return saved.map((g) => ({
      atlasKey: g.atlasKey ?? "interior",
      spriteX: g.spriteX ?? 0,
      spriteY: g.spriteY ?? 0,
      spriteWidth: g.spriteWidth ?? 16,
      spriteHeight: g.spriteHeight ?? 16,
      ...g,
    }));
  }
  return GROCERY_ITEMS.map((g) => ({
    ...g,
    sellableInStore: true,
    atlasKey: "interior",
    spriteX: 0,
    spriteY: 0,
    spriteWidth: 16,
    spriteHeight: 16,
  }));
}

export function saveGroceryCatalog(items: DevToolsGroceryItem[]) {
  writeJson(GROCERY_KEY, items);
}

export function loadClothCatalog(): DevToolsClothItem[] {
  const saved = readJson<DevToolsClothItem[] | null>(CLOTH_KEY, null);
  if (saved && saved.length > 0) {
    return saved.map((c) => {
      if (hasAtlasCrop(c)) return c;
      return { ...c, ...defaultClothCrop(c.sourceKey) };
    });
  }
  return defaultClothCatalog();
}

export function saveClothCatalog(items: DevToolsClothItem[]) {
  writeJson(CLOTH_KEY, items);
}

export function loadHousingSkuCatalog(): DevToolsHousingSku[] {
  const saved = readJson<DevToolsHousingSku[] | null>(HOUSING_SKU_KEY, null);
  if (saved && saved.length > 0) {
    return seedHousingSkusFromInventory(saved);
  }
  return seedHousingSkusFromInventory();
}

export function saveHousingSkuCatalog(items: DevToolsHousingSku[]) {
  writeJson(HOUSING_SKU_KEY, items);
}

export function loadDishCatalog(): DevToolsDishItem[] {
  const saved = readJson<DevToolsDishItem[] | null>(DISHES_KEY, null);
  if (saved && saved.length > 0) return seedDishesFromRecipes(saved);
  return defaultDishCatalog();
}

export function saveDishCatalog(items: DevToolsDishItem[]) {
  writeJson(DISHES_KEY, items);
}

/** Merge any new recipes into an existing dish catalog. */
export function seedDishesFromRecipes(
  existing: DevToolsDishItem[] = [],
): DevToolsDishItem[] {
  const byRecipe = new Map(
    existing.filter((d) => d.recipeId).map((d) => [d.recipeId!, d]),
  );
  const byId = new Map(existing.map((d) => [d.id, d]));
  const next = [...existing];
  for (const recipe of RECIPES) {
    if (byRecipe.has(recipe.id)) continue;
    const id = `dish_${recipe.id}`;
    if (byId.has(id)) continue;
    const atlasKey = DISH_FOOD_ATLAS[recipe.id] ?? "interior";
    const pack = resolveAtlasPack(atlasKey);
    const isFood = atlasKey.startsWith("food:");
    const row: DevToolsDishItem = {
      id,
      recipeId: recipe.id,
      name: recipe.name,
      emoji: recipe.emoji,
      description: recipe.description,
      sellableInStore: false,
      price: 25,
      atlasKey,
      spriteX: 0,
      spriteY: 0,
      spriteWidth: isFood ? pack.width : 16,
      spriteHeight: isFood ? pack.height : 16,
      updatedAt: Date.now(),
    };
    next.push(row);
    byRecipe.set(recipe.id, row);
  }
  return next;
}

export function seedHousingSkusFromInventory(
  existing: DevToolsHousingSku[] = [],
): DevToolsHousingSku[] {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const next = [...existing];
  for (const item of INVENTORY_CATALOG) {
    if (item.kind !== "tile" && item.kind !== "window") continue;
    const crop = defaultInteriorCropForSprite(
      item.sprite as FurnitureSprite | "window",
    );
    const prev = byId.get(item.id);
    if (prev) {
      // Backfill crops on older SKUs that only had name/price.
      if (!hasAtlasCrop(prev)) {
        const idx = next.findIndex((s) => s.id === prev.id);
        if (idx >= 0) {
          next[idx] = { ...prev, ...crop, updatedAt: Date.now() };
        }
      }
      continue;
    }
    const row: DevToolsHousingSku = {
      id: item.id,
      name: item.name,
      price: item.price,
      sellableInStore: true,
      kind: item.kind,
      sprite: item.sprite,
      collision: item.collision,
      ...crop,
      updatedAt: Date.now(),
    };
    next.push(row);
    byId.set(row.id, row);
  }
  return next;
}

/** Crop for a Store / inventory row (housing SKU or furniture DevTools). */
export function cropForInventoryItem(
  item: InventoryItemDef,
): AtlasCropFields | null {
  if (item.kind === "tile" || item.kind === "window") {
    const sku = housingSkuOverride(item.id);
    if (sku && hasAtlasCrop(sku)) return asCrop(sku) ?? null;
  }
  // Lazy import avoids circular deps with spriteOverrides ↔ catalogExtras.
  try {
    const { cropOverride } = require("./spriteOverrides") as {
      cropOverride: (sprite: FurnitureSprite) => AtlasCropFields | null;
    };
    if (item.sprite !== "window") {
      return cropOverride(item.sprite as FurnitureSprite);
    }
  } catch {
    // ignore
  }
  return null;
}

/** Grocery items for the Store (sellable only). */
export function groceryForStore(): GroceryStoreListing[] {
  return loadGroceryCatalog()
    .filter((g) => g.sellableInStore !== false)
    .map(
      ({
        sellableInStore: _s,
        updatedAt: _u,
        atlasKey,
        spriteX,
        spriteY,
        spriteWidth,
        spriteHeight,
        ...rest
      }) => ({
        ...rest,
        crop: asCrop({ atlasKey, spriteX, spriteY, spriteWidth, spriteHeight }),
      }),
    );
}

export function clothesForStore(): ClothStoreListing[] {
  return loadClothCatalog()
    .filter((c) => c.sellableInStore !== false)
    .map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      patch: c.patch,
      source: clothSource(c.sourceKey),
      crop: asCrop(c),
    }));
}

export function dishesForStore(): DishStoreListing[] {
  return loadDishCatalog()
    .filter((d) => d.sellableInStore !== false)
    .map((d) => ({
      id: d.id,
      recipeId: d.recipeId,
      name: d.name,
      emoji: d.emoji,
      description: d.description,
      price: typeof d.price === "number" ? d.price : 25,
      crop: asCrop(d),
    }));
}

/** Look up a dish by recipe id (for cooking results). */
export function dishForRecipe(recipeId: string | null): DevToolsDishItem | null {
  if (!recipeId) return null;
  return (
    loadDishCatalog().find((d) => d.recipeId === recipeId || d.id === recipeId) ??
    null
  );
}

export function housingSkuOverride(
  id: InventoryItemId,
): DevToolsHousingSku | undefined {
  return loadHousingSkuCatalog().find((s) => s.id === id);
}
