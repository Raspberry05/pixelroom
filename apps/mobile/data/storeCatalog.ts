import type { Appearance } from "@pixelroom/core";
import type { ImageSourcePropType } from "react-native";
import {
  INVENTORY_CATALOG,
  type InventoryItemDef,
  type InventoryItemId,
} from "./inventory";
import { SPRITE_BY_ID, type FurnitureSprite } from "./roomLayout";
import { COZY_SHEET, SHEET_PRESETS } from "./sprites";

export type StoreTabId = "furniture" | "housing" | "clothes" | "grocery";

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
  { id: "clothes", label: "Clothes" },
];

/** Housing = finishes & wall openings; furniture = placeable objects. */
export function storeTabForInventory(item: InventoryItemDef): StoreTabId {
  if (item.kind === "tile" || item.kind === "window") return "housing";
  if (item.collision === "wallDecor") return "housing";
  return "furniture";
}

export function inventoryForTab(tab: StoreTabId): InventoryItemDef[] {
  if (tab === "clothes") return [];
  return INVENTORY_CATALOG.filter((item) => storeTabForInventory(item) === tab);
}

export function spriteSourceForItem(item: InventoryItemDef): ImageSourcePropType | null {
  if (item.sprite === "window") {
    // Soft window stand-in until a dedicated window sprite ships.
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
    id: "cloth_purple_pants",
    name: "Purple pants",
    price: 45,
    patch: { kit: "cozy", pants: "purple" },
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
