import type { Appearance } from "@pixelroom/core";
import type { ImageSourcePropType } from "react-native";
import {
  INVENTORY_CATALOG,
  inventoryIdForSprite,
  type InventoryItemDef,
  type InventoryItemId,
} from "./inventory";
import { isTvScreenSprite } from "./furnitureVisual";
import { housingSkuOverride } from "./catalogExtras";
import { SPRITE_BY_ID, type FurnitureSprite } from "./roomLayout";
import { COZY_SHEET, SHEET_PRESETS } from "./sprites";

export type StoreTabId =
  | "furniture"
  | "housing"
  | "clothes"
  | "grocery"
  | "dishes";

export type ClothStoreItem = {
  id: string;
  name: string;
  price: number;
  /** Appearance patch applied on purchase / equip. */
  patch: Partial<Appearance>;
  source: ImageSourcePropType;
};

export const STORE_TABS: { id: StoreTabId; label: string; emoji?: string }[] = [
  { id: "furniture", label: "Furniture" },
  { id: "housing", label: "Housing" },
  { id: "grocery", label: "Grocery", emoji: "🛒" },
  { id: "dishes", label: "Dishes", emoji: "🍽️" },
  { id: "clothes", label: "Clothes" },
];

type DevToolsStoreRow = {
  id: string;
  sprite: FurnitureSprite;
  name: string;
  price: number;
  category?: string;
  collision?: InventoryItemDef["collision"];
  anchor?: string;
  updatedAt?: number;
  /** undefined / true = listed; false = hidden from Store */
  sellableInStore?: boolean;
  /** Manual Store tab override from DevTools Items. */
  catalogGroup?: "furniture" | "housing";
};

const DEVTOOLS_FURNITURE_KEY = "pixelroom.devtools.furniture";
const DEVTOOLS_DELETED_KEY = "pixelroom.devtools.deletedCatalog";

function loadDeletedCatalogIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = JSON.parse(
      localStorage.getItem(DEVTOOLS_DELETED_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function loadDevToolsStoreRows(): DevToolsStoreRow[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(
      localStorage.getItem(DEVTOOLS_FURNITURE_KEY) ?? "[]",
    ) as DevToolsStoreRow[];
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (row) =>
        row &&
        typeof row.id === "string" &&
        typeof row.sprite === "string" &&
        !isTvScreenSprite(row.sprite as FurnitureSprite),
    );
  } catch {
    return [];
  }
}

function isSellable(row: DevToolsStoreRow): boolean {
  return row.sellableInStore !== false;
}

/** Housing = finishes & wall openings; furniture = placeable objects. */
export function storeTabForInventory(item: InventoryItemDef): StoreTabId {
  if (item.kind === "tile" || item.kind === "window") return "housing";
  if (item.collision === "wallDecor") return "housing";
  return "furniture";
}

function storeTabForDevToolsRow(
  row: DevToolsStoreRow,
  def: InventoryItemDef,
): StoreTabId {
  if (row.catalogGroup === "furniture" || row.catalogGroup === "housing") {
    return row.catalogGroup;
  }
  return storeTabForInventory(def);
}

function storeIdForDevToolsRow(row: DevToolsStoreRow): InventoryItemId {
  return inventoryIdForSprite(row.sprite) ?? `devtools_${row.id}`;
}

function defFromDevToolsRow(row: DevToolsStoreRow): InventoryItemDef | null {
  const meta = SPRITE_BY_ID[row.sprite];
  if (!meta || meta.overlayFrame) return null;
  const mapped = inventoryIdForSprite(row.sprite);
  const staticDef = mapped
    ? INVENTORY_CATALOG.find((i) => i.id === mapped)
    : undefined;
  return {
    id: storeIdForDevToolsRow(row),
    name: row.name?.trim() ? row.name : (meta.label ?? row.sprite),
    sprite: row.sprite,
    kind: staticDef?.kind ?? "furniture",
    collision: row.collision ?? staticDef?.collision ?? null,
    price:
      typeof row.price === "number" && row.price >= 0
        ? row.price
        : (staticDef?.price ?? 50),
    starterQty: staticDef?.starterQty ?? 0,
  };
}

/** True if this static SKU was removed or marked Hidden in DevTools. */
function staticItemBlockedByDevTools(
  item: InventoryItemDef,
  rows: DevToolsStoreRow[],
  deleted: Set<string>,
): boolean {
  if (item.kind === "tile" || item.kind === "window") return false;

  for (const delId of deleted) {
    if (!delId.startsWith("catalog_")) continue;
    const sprite = delId.slice("catalog_".length) as FurnitureSprite;
    if (item.sprite === sprite) return true;
    if (inventoryIdForSprite(sprite) === item.id) return true;
  }

  const matches = rows.filter((row) => {
    const invId = inventoryIdForSprite(row.sprite);
    return invId === item.id || row.sprite === item.sprite;
  });
  if (matches.length === 0) return false;
  // Any matching row that is explicitly hidden blocks the static SKU.
  // If at least one is sellable, DevTools listing replaces static (covered).
  return matches.every((row) => !isSellable(row));
}

/**
 * Store listings:
 * 1. Sellable DevTools furniture (name/price) — replaces matching static SKUs
 * 2. Static catalog items not covered / not deleted / not Hidden
 * 3. Custom DevTools items without an inventory SKU
 *
 * Tiles & windows always stay available in Housing.
 */
export function inventoryForTab(tab: StoreTabId): InventoryItemDef[] {
  if (tab === "clothes" || tab === "grocery" || tab === "dishes") return [];

  const rows = loadDevToolsStoreRows();
  const deleted = loadDeletedCatalogIds();

  const sellableRows = rows.filter(
    (row) => isSellable(row) && !deleted.has(row.id),
  );

  const ranked = [...sellableRows].sort((a, b) => {
    const cat = (r: DevToolsStoreRow) => (r.id.startsWith("catalog_") ? 1 : 0);
    const catDiff = cat(b) - cat(a);
    if (catDiff !== 0) return catDiff;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });

  const seen = new Set<InventoryItemId>();
  const fromDevTools: InventoryItemDef[] = [];
  for (const row of ranked) {
    const def = defFromDevToolsRow(row);
    if (!def) continue;
    if (storeTabForDevToolsRow(row, def) !== tab) continue;
    if (seen.has(def.id)) continue;
    seen.add(def.id);
    fromDevTools.push(def);
  }

  const fromStatic = INVENTORY_CATALOG.filter((item) => {
    if (storeTabForInventory(item) !== tab) return false;
    if (seen.has(item.id)) return false; // replaced by DevTools row
    if (staticItemBlockedByDevTools(item, rows, deleted)) return false;
    return true;
  }).map((item) => {
    // Tile / window name-price-sellable from Housing SKU editor.
    if (item.kind === "tile" || item.kind === "window") {
      const ov = housingSkuOverride(item.id);
      if (!ov) return item;
      if (ov.sellableInStore === false) return null;
      return {
        ...item,
        name: ov.name?.trim() ? ov.name : item.name,
        price:
          typeof ov.price === "number" && ov.price >= 0 ? ov.price : item.price,
      };
    }
    return item;
  }).filter((item): item is InventoryItemDef => item != null);

  return [...fromDevTools, ...fromStatic];
}

export function spriteSourceForItem(
  item: InventoryItemDef,
): ImageSourcePropType | null {
  if (item.sprite === "window") {
    return SPRITE_BY_ID.wallArt.source;
  }
  const meta = SPRITE_BY_ID[item.sprite as FurnitureSprite];
  return meta?.source ?? null;
}

export const CLOTH_CATALOG: ClothStoreItem[] = [
  {
    id: "cloth_red_tee",
    name: "Red tee",
    price: 40,
    patch: { kit: "cozy", outfit: "red" },
    source: COZY_SHEET.source,
  },
  {
    id: "cloth_blue_pants",
    name: "Blue pants",
    price: 35,
    patch: { kit: "cozy", pants: "blue" },
    source: COZY_SHEET.source,
  },
  {
    id: "cloth_purple_hat",
    name: "Purple hat",
    price: 45,
    patch: { kit: "cozy", accessory: "purple" },
    source: COZY_SHEET.source,
  },
  ...SHEET_PRESETS.map((preset, index) => ({
    id: `cloth_sheet_${preset.id}`,
    name: `${preset.label} look`,
    price: 90 + index * 15,
    patch: { kit: "sheet" as const, sheetId: preset.id },
    source: preset.source,
  })),
];

export function inventoryIdsInTab(tab: StoreTabId): InventoryItemId[] {
  return inventoryForTab(tab).map((i) => i.id);
}
