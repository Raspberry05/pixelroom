import type { FurnitureSprite } from "./roomLayout";
import type { MiniGameType } from "./minigames";
import type { CollisionKind } from "./inventory";

/**
 * Developer tools configuration and types
 */

export type SpriteAtlasEntry = {
  id: string;
  name: string;
  atlasKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nativeW: number;
  nativeH: number;
};

export type SittingPosition = {
  id: string;
  x: number; // Grid X offset from furniture origin
  y: number; // Grid Y offset from furniture origin
  direction: "left" | "right" | "up" | "down";
};

export type InteractionHotspot = {
  id: string;
  x: number; // Grid X offset
  y: number; // Grid Y offset
  width: number;
  height: number;
  action: string;
  miniGame?: MiniGameType;
};

export type FurnitureItemDefinition = {
  id: string;
  sprite: FurnitureSprite;
  name: string;
  description: string;
  category: "furniture" | "appliance" | "decoration" | "seating";
  price: number;
  
  // Collision & Physics
  collision: CollisionKind | null;
  anchor: "floor" | "wall";
  gridWidth: number;
  gridHeight: number;
  
  // Interactions
  sittingPositions: SittingPosition[];
  interactionHotspots: InteractionHotspot[];
  
  // Visual
  spriteAtlasKey?: string;
  spriteX?: number;
  spriteY?: number;
  spriteWidth?: number;
  spriteHeight?: number;
  
  // Gameplay
  miniGame?: MiniGameType;
  requiresUnpacking?: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
};

export type RoomTemplate = {
  id: string;
  name: string;
  description: string;
  furniture: Array<{
    itemId: string;
    gx: number;
    gy: number;
    flipped?: boolean;
  }>;
  windows: Array<{
    gx: number;
    gy: number;
    w: number;
    h: number;
  }>;
  floorTiles: Record<string, string>;
  wallTiles: Record<string, string>;
  expansionsLeft: number;
  expansionsRight: number;
  createdAt: number;
  updatedAt: number;
};

export type DevToolsState = {
  furnitureItems: FurnitureItemDefinition[];
  roomTemplates: RoomTemplate[];
  spriteAtlas: SpriteAtlasEntry[];
};

// Storage keys
const DEVTOOLS_FURNITURE_KEY = "pixelroom.devtools.furniture";
const DEVTOOLS_ROOMS_KEY = "pixelroom.devtools.rooms";
const DEVTOOLS_SPRITES_KEY = "pixelroom.devtools.sprites";

/**
 * Load dev tools state from localStorage
 */
export function loadDevToolsState(): DevToolsState {
  if (typeof localStorage === "undefined") {
    return {
      furnitureItems: [],
      roomTemplates: [],
      spriteAtlas: [],
    };
  }

  try {
    const furnitureItems = JSON.parse(
      localStorage.getItem(DEVTOOLS_FURNITURE_KEY) ?? "[]",
    );
    const roomTemplates = JSON.parse(
      localStorage.getItem(DEVTOOLS_ROOMS_KEY) ?? "[]",
    );
    const spriteAtlas = JSON.parse(
      localStorage.getItem(DEVTOOLS_SPRITES_KEY) ?? "[]",
    );

    return { furnitureItems, roomTemplates, spriteAtlas };
  } catch {
    return {
      furnitureItems: [],
      roomTemplates: [],
      spriteAtlas: [],
    };
  }
}

/**
 * Save dev tools state to localStorage
 */
export function saveDevToolsState(state: Partial<DevToolsState>) {
  if (typeof localStorage === "undefined") return;

  try {
    if (state.furnitureItems) {
      localStorage.setItem(
        DEVTOOLS_FURNITURE_KEY,
        JSON.stringify(state.furnitureItems),
      );
    }
    if (state.roomTemplates) {
      localStorage.setItem(
        DEVTOOLS_ROOMS_KEY,
        JSON.stringify(state.roomTemplates),
      );
    }
    if (state.spriteAtlas) {
      localStorage.setItem(
        DEVTOOLS_SPRITES_KEY,
        JSON.stringify(state.spriteAtlas),
      );
    }
  } catch (error) {
    console.error("Failed to save dev tools state:", error);
  }
}

/**
 * Export dev tools state as JSON
 */
export function exportDevToolsState(state: DevToolsState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import dev tools state from JSON
 */
export function importDevToolsState(json: string): DevToolsState | null {
  try {
    const parsed = JSON.parse(json);
    return {
      furnitureItems: parsed.furnitureItems ?? [],
      roomTemplates: parsed.roomTemplates ?? [],
      spriteAtlas: parsed.spriteAtlas ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Create a new furniture item template
 */
export function createFurnitureTemplate(): FurnitureItemDefinition {
  const now = Date.now();
  return {
    id: `custom_${now}`,
    sprite: "table" as FurnitureSprite,
    name: "New Item",
    description: "Custom furniture item",
    category: "furniture",
    price: 50,
    collision: "solid",
    anchor: "floor",
    gridWidth: 2,
    gridHeight: 1,
    sittingPositions: [],
    interactionHotspots: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new room template
 */
export function createRoomTemplate(): RoomTemplate {
  const now = Date.now();
  return {
    id: `room_${now}`,
    name: "New Room",
    description: "Custom room layout",
    furniture: [],
    windows: [],
    floorTiles: {},
    wallTiles: {},
    expansionsLeft: 0,
    expansionsRight: 0,
    createdAt: now,
    updatedAt: now,
  };
}
