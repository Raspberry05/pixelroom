import type { Appearance } from "@pixelroom/core";
import { COZY_SHEET } from "./sprites";

export type WardrobeSlot = "hair" | "hat" | "top" | "pants";

export type WardrobeItem = {
  id: string;
  slot: WardrobeSlot;
  label: string;
  /** Value written into Appearance for this slot (`null` / empty = unequipped). */
  value: string | null;
  /** Cozy sheet layer row for the thumbnail (undefined = empty card). */
  layerRow?: number;
  /** Always available in the wardrobe (not store-locked). */
  free?: boolean;
  /** Store / ownedClothes id when this piece must be unlocked. */
  clothId?: string;
};

export const WARDROBE_SLOTS: { id: WardrobeSlot; label: string; hint: string }[] = [
  { id: "hair", label: "Hair", hint: "One style at a time" },
  { id: "hat", label: "Hat", hint: "Layers on top of hair" },
  { id: "top", label: "Top", hint: "One top at a time" },
  { id: "pants", label: "Pants", hint: "One pair at a time" },
];

/**
 * Cozy wardrobe pieces. Hats use `accessory`; purple is a hat (row 10), not pants.
 */
export const WARDROBE_ITEMS: WardrobeItem[] = [
  { id: "hair_brown", slot: "hair", label: "Brown", value: "brown", layerRow: COZY_SHEET.rows.hair, free: true },
  { id: "hair_none", slot: "hair", label: "Bald", value: "bald", free: true },

  { id: "hat_none", slot: "hat", label: "No hat", value: null, free: true },
  {
    id: "hat_purple",
    slot: "hat",
    label: "Purple hat",
    value: "purple",
    layerRow: COZY_SHEET.rows.hat,
    clothId: "cloth_purple_hat",
  },

  { id: "top_none", slot: "top", label: "No top", value: "none", free: true },
  {
    id: "top_red",
    slot: "top",
    label: "Red tee",
    value: "red",
    layerRow: COZY_SHEET.rows.shirt,
    clothId: "cloth_red_tee",
    free: true,
  },

  { id: "pants_none", slot: "pants", label: "No pants", value: "none", free: true },
  {
    id: "pants_blue",
    slot: "pants",
    label: "Blue pants",
    value: "blue",
    layerRow: COZY_SHEET.rows.pantsBlue,
    clothId: "cloth_blue_pants",
    free: true,
  },
];

export function isWardrobeItemOwned(
  item: WardrobeItem,
  ownedClothes: readonly string[],
): boolean {
  if (item.free || !item.clothId) return true;
  return ownedClothes.includes(item.clothId);
}

export function isWardrobeItemEquipped(
  item: WardrobeItem,
  appearance: Appearance,
): boolean {
  switch (item.slot) {
    case "hair":
      return appearance.hair === (item.value ?? "bald");
    case "hat":
      return (appearance.accessory ?? null) === item.value;
    case "top":
      return appearance.outfit === (item.value ?? "none");
    case "pants":
      return appearance.pants === (item.value ?? "none");
    default:
      return false;
  }
}

/** Equip (or unequip if already on) a single exclusive slot. */
export function wardrobeEquipPatch(
  item: WardrobeItem,
  appearance: Appearance,
): Partial<Appearance> {
  const equipped = isWardrobeItemEquipped(item, appearance);
  const base: Partial<Appearance> = { kit: "cozy" };

  switch (item.slot) {
    case "hair":
      return {
        ...base,
        hair: equipped && item.value !== "bald" ? "bald" : (item.value ?? "bald"),
      };
    case "hat":
      return {
        ...base,
        accessory: equipped ? null : item.value,
      };
    case "top":
      return {
        ...base,
        outfit:
          equipped && item.value !== "none" ? "none" : (item.value ?? "none"),
      };
    case "pants":
      return {
        ...base,
        pants:
          equipped && item.value !== "none" ? "none" : (item.value ?? "none"),
      };
    default:
      return base;
  }
}

/** Migrate legacy `pants: "purple"` (was mislabeled) → purple hat accessory. */
export function migrateAppearanceHats(appearance: Appearance): Appearance {
  if (appearance.pants !== "purple") return appearance;
  return {
    ...appearance,
    pants: appearance.pants === "purple" ? "blue" : appearance.pants,
    accessory: appearance.accessory ?? "purple",
  };
}
