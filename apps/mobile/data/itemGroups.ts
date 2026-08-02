import { SPRITE_BY_ID, type FurnitureSprite } from "./roomLayout";
import type { FurnitureItemDefinition } from "./devTools";

export type DevToolsCatalogGroup = "furniture" | "housing";

/** Infer group from sprite / collision when no manual override is set. */
export function inferDevToolsItemGroup(
  item: Pick<FurnitureItemDefinition, "sprite" | "collision">,
): DevToolsCatalogGroup {
  if (item.collision === "wallDecor") return "housing";
  const meta = SPRITE_BY_ID[item.sprite as FurnitureSprite];
  if (meta?.tileBrush) return "housing";
  if (
    item.sprite === "floor" ||
    item.sprite === "floorWood" ||
    item.sprite.startsWith("wall")
  ) {
    return "housing";
  }
  return "furniture";
}

/** Which Items filter a DevTools furniture row belongs to. */
export function classifyDevToolsItem(
  item: FurnitureItemDefinition,
): DevToolsCatalogGroup {
  if (item.catalogGroup === "furniture" || item.catalogGroup === "housing") {
    return item.catalogGroup;
  }
  return inferDevToolsItemGroup(item);
}
