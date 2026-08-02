import type { FurnitureSprite } from "./roomLayout";
// Runtime override lookup (type-safe; avoid cycles by only importing the fn).
import { furnitureOverride } from "./spriteOverrides";

export type MiniGameType = "cooking" | "frying" | "cleaning" | "unpack" | "tv" | "bedmaking" | "watering";

export type FurnitureAction = {
  furnitureSprite: FurnitureSprite;
  actionName: string;
  miniGameType: MiniGameType;
  description: string;
};

/**
 * Maps furniture sprites to their interactive actions
 */
export const FURNITURE_ACTIONS: FurnitureAction[] = [
  {
    furnitureSprite: "appliance",
    actionName: "Cook",
    miniGameType: "cooking",
    description: "Prepare a delicious meal",
  },
  {
    furnitureSprite: "tv",
    actionName: "Watch TV",
    miniGameType: "tv",
    description: "Watch your favorite show",
  },
  {
    furnitureSprite: "bed",
    actionName: "Make Bed",
    miniGameType: "bedmaking",
    description: "Make your bed nice and tidy",
  },
  {
    furnitureSprite: "plant",
    actionName: "Water Plant",
    miniGameType: "watering",
    description: "Give your plant some water",
  },
];

const MINI_GAME_LABEL: Record<MiniGameType, string> = {
  cooking: "Cook",
  frying: "Fry",
  cleaning: "Clean",
  unpack: "Unpack",
  tv: "Watch TV",
  bedmaking: "Make Bed",
  watering: "Water Plant",
};

/**
 * Check if a furniture sprite has an interactive action
 */
export function hasAction(sprite: FurnitureSprite): boolean {
  const ov = furnitureOverride(sprite);
  if (ov?.miniGame) return true;
  return FURNITURE_ACTIONS.some((a) => a.furnitureSprite === sprite);
}

/**
 * Get the action for a furniture sprite (DevTools miniGame overrides defaults).
 */
export function getAction(sprite: FurnitureSprite): FurnitureAction | null {
  const ov = furnitureOverride(sprite);
  if (ov?.miniGame) {
    return {
      furnitureSprite: sprite,
      actionName: MINI_GAME_LABEL[ov.miniGame],
      miniGameType: ov.miniGame,
      description: `DevTools · ${ov.miniGame}`,
    };
  }
  return FURNITURE_ACTIONS.find((a) => a.furnitureSprite === sprite) ?? null;
}

/**
 * Calculate dirt level based on days of inactivity
 * 0 = clean, 1 = dusty, 2 = dirty, 3 = very dirty with spider webs
 */
export function calculateDirtLevel(lastActivityMs: number, nowMs: number = Date.now()): number {
  const daysSinceActivity = (nowMs - lastActivityMs) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActivity < 1) return 0; // Clean
  if (daysSinceActivity < 3) return 1; // Dusty
  if (daysSinceActivity < 7) return 2; // Dirty
  return 3; // Very dirty with spider webs
}

/**
 * Get dirt level description
 */
export function getDirtDescription(level: number): string {
  switch (level) {
    case 0:
      return "Spotless";
    case 1:
      return "A bit dusty";
    case 2:
      return "Needs cleaning";
    case 3:
      return "Covered in dust and spider webs!";
    default:
      return "Clean";
  }
}

export type RoomCleanlinessState = {
  lastActivityAt: number;
  lastCleanedAt: number;
  dirtLevel: number;
};

export function createCleanlinessState(): RoomCleanlinessState {
  return {
    lastActivityAt: Date.now(),
    lastCleanedAt: Date.now(),
    dirtLevel: 0,
  };
}
