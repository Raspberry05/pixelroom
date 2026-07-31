import type { ActionKind } from "@pixelroom/core";
import type { FurnitureSprite, RoomDocument } from "./roomLayout";

/**
 * Furniture that must be placed in the room before an action unlocks.
 * Social / emote actions omit from this map and stay always available.
 */
export const ACTION_FURNITURE: Partial<Record<ActionKind, readonly FurnitureSprite[]>> = {
  cook: ["appliance"],
  watch: ["tv"],
  sit: ["chairDown", "chairLeft", "chairRight", "chairUp", "table", "sideTable"],
  sleep: ["bed"],
};

export function furnitureSpritesInRoom(doc: RoomDocument): Set<FurnitureSprite> {
  return new Set(doc.furniture.map((p) => p.sprite));
}

export function isActionUnlocked(
  action: ActionKind,
  sprites: ReadonlySet<FurnitureSprite>,
): boolean {
  const need = ACTION_FURNITURE[action];
  if (!need || need.length === 0) return true;
  return need.some((sprite) => sprites.has(sprite));
}

export function actionUnlockHint(action: ActionKind): string | null {
  const need = ACTION_FURNITURE[action];
  if (!need || need.length === 0) return null;
  if (action === "cook") return "Place an appliance to cook";
  if (action === "watch") return "Place a TV to watch";
  if (action === "sit") return "Place a chair or sofa to sit";
  if (action === "sleep") return "Place a bed to sleep";
  return `Need furniture for *${action}`;
}
