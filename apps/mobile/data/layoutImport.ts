import {
  estimatedExpansionRefund,
  expandCostForSide,
  expansionPurchasesForRange,
  expansionRefundForUser,
  isRoomDocument,
  MAX_SIDE_EXPANSIONS,
  normalizeRoomDocument,
  type ExpansionPurchase,
  type RoomDocument,
} from "./roomLayout";
import {
  getQty,
  inventoryIdForSprite,
  INV_BY_ID,
  refund,
  spend,
  type InventoryItemId,
  type InventoryState,
} from "./inventory";

export type LayoutItemNeed = {
  kind: "item";
  inventoryId: InventoryItemId;
  name: string;
  need: number;
  have: number;
  missing: number;
  price: number;
};

export type LayoutExpandNeed = {
  kind: "expandLeft" | "expandRight";
  need: number;
  have: number;
  missing: number;
  /** Cost to buy the next expansion on that side. */
  nextCost: number;
};

export type LayoutNeed = LayoutItemNeed | LayoutExpandNeed;

export type LayoutImportAnalysis = {
  document: RoomDocument;
  needs: LayoutNeed[];
  /** Inventory counts required by the import (after netting current room refund). */
  requiredItems: Partial<Record<InventoryItemId, number>>;
};

/** Coins reserved for side expansions while an import awaits approval. */
export type ExpansionImportHold = {
  left: number;
  right: number;
  cost: number;
  byUserKey: string;
};

export type DraftExpansions = {
  left: number;
  right: number;
};

/** Count inventory ids consumed by a room document. */
export function countLayoutInventory(
  doc: RoomDocument,
): Partial<Record<InventoryItemId, number>> {
  const counts: Partial<Record<InventoryItemId, number>> = {};

  function add(id: InventoryItemId, n = 1) {
    counts[id] = (counts[id] ?? 0) + n;
  }

  for (const piece of doc.furniture) {
    const id = inventoryIdForSprite(piece.sprite);
    if (id) add(id);
  }

  add("window_basic", doc.windows.length);

  // Additive wall paint always costs tiles.
  add("tile_wall", Object.keys(doc.wallTiles ?? {}).length);

  // Floor: only when not fill-mode — each key is a painted tile.
  if (!doc.floorFill) {
    add("tile_floor", Object.keys(doc.floorTiles ?? {}).length);
  }

  return counts;
}

/**
 * Available stock for import = inventory on hand + everything currently placed
 * (those pieces are refunded when the layout is replaced).
 */
export function availableForImport(
  inventory: InventoryState,
  current: RoomDocument,
): InventoryState {
  let next = { ...inventory };
  const placed = countLayoutInventory(current);
  for (const [id, n] of Object.entries(placed)) {
    next = refund(next, id as InventoryItemId, n ?? 0);
  }
  return next;
}

export function analyzeLayoutImport(
  raw: unknown,
  inventory: InventoryState,
  current: RoomDocument,
  draftExpansions?: DraftExpansions,
): LayoutImportAnalysis | { error: string } {
  if (raw == null || typeof raw !== "object") {
    return { error: "Invalid JSON — expected a room layout object" };
  }

  if (!isRoomDocument(raw) && !Array.isArray((raw as RoomDocument).furniture)) {
    return { error: "Not a room layout — need furniture[] and version" };
  }

  const doc = normalizeRoomDocument(raw);

  if (
    doc.expansionsLeft > MAX_SIDE_EXPANSIONS ||
    doc.expansionsRight > MAX_SIDE_EXPANSIONS
  ) {
    return {
      error: `Expansions max ${MAX_SIDE_EXPANSIONS} per side`,
    };
  }

  const requiredItems = countLayoutInventory(doc);
  const available = availableForImport(inventory, current);
  const needs: LayoutNeed[] = [];

  for (const [id, need] of Object.entries(requiredItems)) {
    const inventoryId = id as InventoryItemId;
    const have = getQty(available, inventoryId);
    const n = need ?? 0;
    if (n > have) {
      const def = INV_BY_ID[inventoryId];
      needs.push({
        kind: "item",
        inventoryId,
        name: def?.name ?? inventoryId,
        need: n,
        have,
        missing: n - have,
        price: def?.price ?? 0,
      });
    }
  }

  const haveLeft = current.expansionsLeft + Math.max(0, draftExpansions?.left ?? 0);
  const haveRight =
    current.expansionsRight + Math.max(0, draftExpansions?.right ?? 0);

  if (doc.expansionsLeft > haveLeft) {
    needs.push({
      kind: "expandLeft",
      need: doc.expansionsLeft,
      have: haveLeft,
      missing: doc.expansionsLeft - haveLeft,
      nextCost: expandCostForSide(haveLeft),
    });
  }

  if (doc.expansionsRight > haveRight) {
    needs.push({
      kind: "expandRight",
      need: doc.expansionsRight,
      have: haveRight,
      missing: doc.expansionsRight - haveRight,
      nextCost: expandCostForSide(haveRight),
    });
  }

  needs.sort((a, b) => {
    if (a.kind !== "item" && b.kind === "item") return -1;
    if (a.kind === "item" && b.kind !== "item") return 1;
    return 0;
  });

  return { document: doc, needs, requiredItems };
}

function withExpansionPurchases(
  current: RoomDocument,
  incoming: RoomDocument,
  hold: ExpansionImportHold | undefined,
): RoomDocument {
  if (!hold || (hold.left <= 0 && hold.right <= 0)) {
    return {
      ...incoming,
      expansionPurchases: incoming.expansionPurchases ?? current.expansionPurchases ?? [],
    };
  }

  const kept: ExpansionPurchase[] = (current.expansionPurchases ?? []).filter(
    (p) =>
      (p.side === "left" && p.index < incoming.expansionsLeft) ||
      (p.side === "right" && p.index < incoming.expansionsRight),
  );

  const added = [
    ...expansionPurchasesForRange(
      "left",
      current.expansionsLeft,
      current.expansionsLeft + hold.left,
      hold.byUserKey,
    ),
    ...expansionPurchasesForRange(
      "right",
      current.expansionsRight,
      current.expansionsRight + hold.right,
      hold.byUserKey,
    ),
  ];

  return {
    ...incoming,
    expansionPurchases: [...kept, ...added],
  };
}

/**
 * Replace current layout with imported one: refund placed stock, spend for import.
 * Side expansions may be covered by a prior coin hold (draft) instead of the live room.
 */
export function applyLayoutImport(
  inventory: InventoryState,
  current: RoomDocument,
  incoming: RoomDocument,
  opts?: { expansionHold?: ExpansionImportHold },
): { inventory: InventoryState; document: RoomDocument } | { error: string } {
  const hold = opts?.expansionHold;
  const draft =
    hold && (hold.left > 0 || hold.right > 0)
      ? { left: hold.left, right: hold.right }
      : undefined;
  const analysis = analyzeLayoutImport(incoming, inventory, current, draft);
  if ("error" in analysis) return analysis;
  if (analysis.needs.length > 0) {
    return { error: "Still missing items or room expansions" };
  }

  let nextInv = availableForImport(inventory, current);
  for (const [id, n] of Object.entries(analysis.requiredItems)) {
    const spent = spend(nextInv, id as InventoryItemId, n ?? 0);
    if (!spent) {
      return { error: `Could not spend ${id}` };
    }
    nextInv = spent;
  }

  return {
    inventory: nextInv,
    document: withExpansionPurchases(current, analysis.document, hold),
  };
}

/**
 * Clear room layout: return placed furniture to inventory and refund expansion
 * coins to whoever bought each wall chunk.
 */
export function applyLayoutReset(
  inventory: InventoryState,
  coins: number,
  current: RoomDocument,
  fresh: RoomDocument,
  selfKey: string,
  opts?: { isProposer?: boolean },
): { inventory: InventoryState; coins: number; document: RoomDocument; expansionRefund: number } {
  const nextInv = availableForImport(inventory, current);
  const purchases = current.expansionPurchases ?? [];
  let expansionRefund = expansionRefundForUser(current, selfKey);
  if (expansionRefund === 0 && purchases.length === 0 && opts?.isProposer) {
    // Legacy rooms with expansions but no purchase log → refund proposer.
    expansionRefund = estimatedExpansionRefund(current);
  }
  return {
    inventory: nextInv,
    coins: coins + expansionRefund,
    document: fresh,
    expansionRefund,
  };
}

export function parseLayoutJson(
  text: string,
): unknown | { error: string } {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: "Could not parse JSON" };
  }
}
