import type { FurnitureSprite, RoomDocument } from "./roomLayout";
import type { ApplianceType } from "./recipes";

/**
 * Maps furniture sprites to their appliance types
 */
export const FURNITURE_TO_APPLIANCE: Partial<Record<FurnitureSprite, ApplianceType>> = {
  appliance: "stove", // Default stove/cooktop
  // Future: Add specific appliance sprites like "fridge", "fryer", "oven", etc.
};

/**
 * Sprite types for specific appliances
 */
export type SpecializedAppliance = {
  sprite: FurnitureSprite;
  type: ApplianceType;
  displayName: string;
  emoji: string;
};

/**
 * Extended appliances beyond the basic "appliance" sprite
 * These would be added to the store catalog
 */
export const SPECIALIZED_APPLIANCES: SpecializedAppliance[] = [
  // Note: These sprites would need to be added to FurnitureSprite type
  // For now, we'll use placeholder comments
  // { sprite: "fridge", type: "fridge", displayName: "Refrigerator", emoji: "🧊" },
  // { sprite: "fryer", type: "fryer", displayName: "Deep Fryer", emoji: "🍟" },
  // { sprite: "oven", type: "oven", displayName: "Oven", emoji: "🔥" },
  // { sprite: "microwave", type: "microwave", displayName: "Microwave", emoji: "📻" },
  // { sprite: "blender", type: "blender", displayName: "Blender", emoji: "🌀" },
];

/**
 * Check if a room has a specific appliance
 */
export function hasAppliance(
  document: RoomDocument,
  appliance: ApplianceType | "fridge"
): boolean {
  // Kitchen "appliance" stands in for every cooking station until specialized
  // sprites (fryer, oven, …) ship — so Test Lab / cook+fry flows stay testable.
  if (document.furniture.some((f) => f.sprite === "appliance")) {
    return true;
  }

  return document.furniture.some((f) => {
    const furnitureType = FURNITURE_TO_APPLIANCE[f.sprite];
    return furnitureType === appliance;
  });
}

/**
 * Get all appliances in the room
 */
export function getAvailableAppliances(document: RoomDocument): (ApplianceType | "fridge")[] {
  const appliances = new Set<ApplianceType | "fridge">();

  for (const furniture of document.furniture) {
    const applianceType = FURNITURE_TO_APPLIANCE[furniture.sprite];
    if (applianceType) {
      appliances.add(applianceType);
    }
  }

  // Generic appliance unlocks the full kitchen set for demos / Test Lab.
  if (document.furniture.some((f) => f.sprite === "appliance")) {
    appliances.add("fridge");
    appliances.add("stove");
    appliances.add("fryer");
    appliances.add("oven");
    appliances.add("microwave");
    appliances.add("blender");
  }

  return Array.from(appliances);
}

/**
 * Get missing appliances for a recipe
 */
export function getMissingAppliance(
  document: RoomDocument,
  requiredAppliance?: ApplianceType
): ApplianceType | null {
  if (!requiredAppliance) return null;
  
  return hasAppliance(document, requiredAppliance) ? null : requiredAppliance;
}

/**
 * Get friendly name for appliance type
 */
export function getApplianceName(appliance: ApplianceType | "fridge"): string {
  switch (appliance) {
    case "stove":
      return "Stove/Cooktop";
    case "oven":
      return "Oven";
    case "fryer":
      return "Deep Fryer";
    case "microwave":
      return "Microwave";
    case "blender":
      return "Blender";
    case "fridge":
      return "Refrigerator";
    default:
      return appliance;
  }
}
