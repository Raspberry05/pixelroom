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
  // For now, check if any "appliance" furniture exists as a placeholder
  // In the future, this should check for specific appliance types
  if (appliance === "fridge") {
    // Check for fridge sprite (when implemented)
    // For now, we'll be lenient and return true if they have any appliance
    return document.furniture.some((f) => f.sprite === "appliance");
  }
  
  // Check if they have the required cooking appliance
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
  
  // For now, assume any appliance can act as a fridge
  if (document.furniture.some((f) => f.sprite === "appliance")) {
    appliances.add("fridge");
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
