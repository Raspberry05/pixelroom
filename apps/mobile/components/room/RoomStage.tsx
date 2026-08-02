import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type PanResponderGestureState,
} from "react-native";
import {
  ROOM_STYLES,
  type Appearance,
  type CharacterId,
  type Room,
  type RoomStyleId,
} from "@pixelroom/core";
import {
  canPlaceFurniture,
  inventoryIdForSprite,
  inventoryIdForTile,
  refund,
  spend,
  type InventoryState,
} from "../../data/inventory";
import {
  CELL_PX,
  CHUNK_CELLS,
  DISPLAY_SCALE_MAX,
  DISPLAY_SCALE_MIN,
  EDGE_WALL_PX,
  FLOOR_DEPTH_CELLS,
  FLOOR_HEIGHT_MAX_RATIO,
  MAX_SIDE_EXPANSIONS,
  expandCostForSide,
  REF_STAGE_HEIGHT,
  SPRITE_BY_ID,
  VIEW_BOOST,
  WORLD_SCALE,
  clampGrid,
  createPlacementId,
  drawnSize,
  hasFloorTile,
  parseTileKey,
  setFloorTile,
  setWallTile,
  snapToGrid,
  tileKey,
  worldCellCount,
  type EditTool,
  type FurnitureSprite,
  type PlacedFurniture,
  type PlacedWindow,
  type RoomDocument,
} from "../../data/roomLayout";
import { FURNITURE } from "../../data/sprites";
import { colors } from "../../theme";
import { AtlasSprite } from "../AtlasSprite";
import { PixelImage } from "../PixelImage";
import {
  hasAtlasCrop,
  type AtlasCropFields,
} from "../../data/atlasCrop";
import { housingSkuOverride } from "../../data/catalogExtras";
import {
  cropOverride,
  overrideActiveVisualStateId,
  overrideHitPad,
} from "../../data/spriteOverrides";
import { CharacterSprite } from "./CharacterSprite";
import { FurniturePiece, FLOOR_RATIO } from "./FurniturePiece";
import { UnpackingMiniGame } from "./UnpackingMiniGame";
import { DirtOverlay } from "./DirtOverlay";
import type { FurnitureCareState } from "../../data/furnitureCare";
import { careIndicatorForSprite } from "../../data/furnitureCare";

function tileCrop(sprite: FurnitureSprite): AtlasCropFields | null {
  const fromFurniture = cropOverride(sprite);
  if (fromFurniture) return fromFurniture;
  const invId = inventoryIdForSprite(sprite);
  if (!invId) return null;
  const sku = housingSkuOverride(invId);
  if (!sku || !hasAtlasCrop(sku)) return null;
  return {
    atlasKey: sku.atlasKey ?? "interior",
    spriteX: sku.spriteX,
    spriteY: sku.spriteY,
    spriteWidth: sku.spriteWidth,
    spriteHeight: sku.spriteHeight,
  };
}

type Actor = {
  characterId: CharacterId;
  name: string;
  appearance: Appearance;
  isSelf: boolean;
  userKey: string;
};

type BubbleMap = Record<
  string,
  { id: string; text: string; kind: "text" | "action" | "system"; at: number }[] | undefined
>;

type Props = {
  room: Room;
  actors: Actor[];
  bubblesByUserKey?: BubbleMap;
  styleId?: RoomStyleId;
  document: RoomDocument;
  onChangeDocument: (next: RoomDocument) => void;
  inventory: InventoryState;
  onChangeInventory: (next: InventoryState) => void;
  onStatus: (message: string | null) => void;
  editing: boolean;
  tool: EditTool;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  /** Called when user taps + to expand; parent charges coins then applies expand. */
  onRequestExpand: (side: "left" | "right") => void;
  /** Called when user taps − to refund the outermost expansion on that side. */
  onRequestShrink: (side: "left" | "right") => void;
  /** Walk self toward a logical X (camera center, or soft approach to an on-screen peer). */
  onViewportCenterX?: (logicalX: number) => void;
  /** User keys whose characters + bubbles are fully readable (HUD can hide). */
  onVisibleUserKeys?: (keys: string[]) => void;
  /** User keys at least half-visible — OK to walk over and talk. */
  onBodyVisibleUserKeys?: (keys: string[]) => void;
  /** Current dirt level (0-3) for displaying dirt overlays. */
  dirtLevel?: number;
  /** Per-room plant / TV / bed care timestamps for indicators. */
  furnitureCare?: FurnitureCareState | null;
};

export { FLOOR_RATIO };

const DEFAULT_WINDOW_W = 4;
const DEFAULT_WINDOW_H = 3;

type LayoutMetrics = {
  cellPx: number;
  cols: number;
  maxGx: number;
  floorRows: number;
  wallRows: number;
  floorH: number;
  chunkDisplayW: number;
  worldW: number;
  homeOriginPx: number;
};

/** Darken a #rrggbb color slightly (side walls = less light than the room face). */
function shadeHex(hex: string, factor = 0.88): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const n = Number.parseInt(raw, 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Side pads: full-height wall, green trim at the very bottom (near-camera plane). */
function SideLimitPad({
  side,
  width,
  wallColor,
  accentColor,
}: {
  side: "left" | "right";
  width: number;
  wallColor: string;
  accentColor: string;
}) {
  const wall = shadeHex(wallColor, 0.86);
  const accent = shadeHex(accentColor, 0.88);
  return (
    <View style={[styles.sideWall, { width, backgroundColor: wall }]}>
      <View
        pointerEvents="none"
        style={[styles.sideWallFrontTrim, { backgroundColor: accent }]}
      />
      <View
        pointerEvents="none"
        style={side === "left" ? styles.sideWallEdgeRight : styles.sideWallEdgeLeft}
      />
    </View>
  );
}

export function RoomStage({
  room,
  actors,
  bubblesByUserKey = {},
  styleId,
  document,
  onChangeDocument,
  inventory,
  onChangeInventory,
  onStatus,
  editing,
  tool,
  selectedId,
  onSelectId,
  onRequestExpand,
  onRequestShrink,
  onViewportCenterX,
  onVisibleUserKeys,
  onBodyVisibleUserKeys,
  dirtLevel = 0,
  furnitureCare = null,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragKind, setDragKind] = useState<"furniture" | "window" | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [panLocked, setPanLocked] = useState(false);
  const [unpackingFurniture, setUnpackingFurniture] = useState<PlacedFurniture | null>(null);

  const dragOrigin = useRef<{ gx: number; gy: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragKindRef = useRef<"furniture" | "window" | null>(null);
  const lastPaintKey = useRef<string | null>(null);
  const painting = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollXRef = useRef(0);
  const didInitialScroll = useRef(false);
  const scrollHomeKey = useRef("");

  const docRef = useRef(document);
  const invRef = useRef(inventory);
  const toolRef = useRef(tool);
  const sizeRef = useRef(size);
  const layoutRef = useRef<LayoutMetrics>({
    cellPx: CELL_PX,
    cols: CHUNK_CELLS,
    maxGx: CHUNK_CELLS - 2,
    floorRows: 0,
    wallRows: 0,
    floorH: 0,
    chunkDisplayW: 0,
    worldW: 0,
    homeOriginPx: 0,
  });
  const onChangeDocRef = useRef(onChangeDocument);
  const onChangeInvRef = useRef(onChangeInventory);
  const onSelectRef = useRef(onSelectId);
  const onStatusRef = useRef(onStatus);

  docRef.current = document;
  invRef.current = inventory;
  toolRef.current = tool;
  sizeRef.current = size;
  onChangeDocRef.current = onChangeDocument;
  onChangeInvRef.current = onChangeInventory;
  onSelectRef.current = onSelectId;
  onStatusRef.current = onStatus;

  const theme = ROOM_STYLES[styleId ?? room.styleId] ?? ROOM_STYLES.garden;

  const onLayoutChange = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const sorted = useMemo(
    () => [...document.furniture].sort((a, b) => a.gy - b.gy || a.gx - b.gx),
    [document.furniture],
  );

  const ready = size.width > 0 && size.height > 0;
  const cols = worldCellCount(document);
  // Near-fixed cell size. Soft-scale with stage height; never shrink to fit
  // width (scroll instead). Floor depth is a fixed cell count so phone and
  // tablet share the same furniture/tile grid — extra height grows the wall.
  let displayScale = 1;
  let cellPx = CELL_PX;
  if (ready) {
    displayScale = Math.min(
      DISPLAY_SCALE_MAX,
      Math.max(DISPLAY_SCALE_MIN, size.height / REF_STAGE_HEIGHT),
    );
    cellPx = Math.max(36, Math.round(CELL_PX * displayScale));
    const maxFloorH = size.height * FLOOR_HEIGHT_MAX_RATIO;
    if (FLOOR_DEPTH_CELLS * cellPx > maxFloorH) {
      cellPx = Math.max(36, Math.floor(maxFloorH / FLOOR_DEPTH_CELLS));
    }
  }
  const floorRows = ready ? FLOOR_DEPTH_CELLS : 0;
  const floorH = floorRows * cellPx;
  const floorRatio = ready && size.height > 0 ? floorH / size.height : FLOOR_RATIO;
  const wallRows = ready
    ? Math.max(1, Math.floor(Math.max(0, size.height - floorH) / cellPx))
    : 0;
  const chunkDisplayW = cellPx * CHUNK_CELLS;
  const worldW = cellPx * cols;
  // Always keep a visible exterior wall past each end of the room so scroll
  // limits read clearly (and center a short world inside a wide viewport).
  const edgeWall = Math.max(EDGE_WALL_PX, Math.round(cellPx * 0.55));
  const filler = ready
    ? Math.max(edgeWall, Math.ceil((size.width - worldW) / 2))
    : edgeWall;
  const contentW = worldW + filler * 2;
  const maxGx = Math.max(0, cols - 2);
  const homeOriginPx = document.expansionsLeft * chunkDisplayW;
  const canScroll = ready && contentW > size.width + 1;

  layoutRef.current = {
    cellPx,
    cols,
    maxGx,
    floorRows,
    wallRows,
    floorH,
    chunkDisplayW,
    worldW,
    homeOriginPx,
  };

  useEffect(() => {
    if (!ready) return;
    const expandKey = `${document.expansionsLeft}:${document.expansionsRight}`;
    const shouldCenter =
      !didInitialScroll.current || scrollHomeKey.current !== expandKey;
    if (!shouldCenter) return;
    scrollHomeKey.current = expandKey;
    const homeCenter = filler + homeOriginPx + chunkDisplayW / 2;
    const targetX = Math.max(
      0,
      Math.min(Math.max(0, contentW - size.width), homeCenter - size.width / 2),
    );
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: targetX, animated: didInitialScroll.current });
      didInitialScroll.current = true;
      reportViewport(targetX);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    ready,
    contentW,
    size.width,
    filler,
    homeOriginPx,
    chunkDisplayW,
    document.expansionsLeft,
    document.expansionsRight,
  ]);

  const onViewportCenterXRef = useRef(onViewportCenterX);
  onViewportCenterXRef.current = onViewportCenterX;
  const onVisibleUserKeysRef = useRef(onVisibleUserKeys);
  onVisibleUserKeysRef.current = onVisibleUserKeys;
  const onBodyVisibleUserKeysRef = useRef(onBodyVisibleUserKeys);
  onBodyVisibleUserKeysRef.current = onBodyVisibleUserKeys;
  const viewportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibleKey = useRef("");
  const lastBodyVisibleKey = useRef("");
  const visibleKeysRef = useRef<Set<string>>(new Set());
  const lastFollowSendAt = useRef(0);
  const lastSocialSendAt = useRef(0);
  const cameraFollowActiveRef = useRef(false);

  function handleTapPacked(item: PlacedFurniture) {
    if (editing) return;
    setUnpackingFurniture(item);
  }

  function handleUnpackComplete() {
    if (!unpackingFurniture) return;
    onChangeDocument({
      ...document,
      furniture: document.furniture.map((p) =>
        p.id === unpackingFurniture.id ? { ...p, packed: false } : p,
      ),
    });
    setUnpackingFurniture(null);
    onStatus("Furniture unpacked!");
  }

  function handleUnpackCancel() {
    setUnpackingFurniture(null);
  }

  function characterContentBounds(
    logicalX: number,
    span: number,
    scale: number,
  ): { left: number; right: number; center: number; drawBase: number } {
    const drawBase = 32 * WORLD_SCALE * VIEW_BOOST * scale;
    const xRatio = Math.min(0.96, Math.max(0.04, logicalX / Math.max(1, span)));
    const leftInWorld = xRatio * worldW - drawBase / 2;
    const left = filler + leftInWorld;
    return { left, right: left + drawBase, center: left + drawBase / 2, drawBase };
  }

  function reportViewport(scrollX: number) {
    scrollXRef.current = scrollX;
    if (!ready || worldW <= 0 || size.width <= 0) return;
    const span = Math.max(CHUNK_CELLS, cols);
    const viewLeft = scrollX;
    const viewRight = scrollX + size.width;
    // Soft edge: anything near the bezel counts as unreadable.
    const edgeInset = Math.max(24, Math.min(72, size.width * 0.1));
    // Keys whose in-world speech is fully readable (HUD should hide for them).
    const chatVisible: string[] = [];
    const bodyVisible: string[] = [];
    let selfLogicalX = span / 2;
    // Overhead chat band is ~180px wide, centered on the sprite.
    const bubbleHalf = 90;

    for (const actor of actors) {
      const member = room.memberState[String(actor.characterId)];
      if (!member) continue;
      const bounds = characterContentBounds(member.position.x, span, displayScale);
      const bubbleLeft = bounds.center - bubbleHalf;
      const bubbleRight = bounds.center + bubbleHalf;
      const bodyHalfVisible =
        bounds.right > viewLeft + bounds.drawBase * 0.5 &&
        bounds.left < viewRight - bounds.drawBase * 0.5;

      // Only treat chat as "on screen" when the whole character AND its
      // overhead bubble sit fully inside the readable viewport. Edge / half
      // clips keep the bottom HUD bubbles so text stays readable.
      const characterFullyOnScreen =
        bounds.left >= viewLeft + edgeInset &&
        bounds.right <= viewRight - edgeInset;
      const bubbleFullyOnScreen =
        bubbleLeft >= viewLeft + edgeInset &&
        bubbleRight <= viewRight - edgeInset;

      // Offline / sleeping never count — no bubbles for them at all.
      if (
        member.presence === "active" &&
        characterFullyOnScreen &&
        bubbleFullyOnScreen
      ) {
        chatVisible.push(actor.userKey);
      }
      if (actor.isSelf) {
        selfLogicalX = member.position.x;
      } else if (member.presence === "active" && bodyHalfVisible) {
        bodyVisible.push(actor.userKey);
      }
    }

    const visibleKey = chatVisible.slice().sort().join(",");
    visibleKeysRef.current = new Set(bodyVisible);
    if (visibleKey !== lastVisibleKey.current) {
      lastVisibleKey.current = visibleKey;
      onVisibleUserKeysRef.current?.(chatVisible);
    }
    const bodyKey = bodyVisible.slice().sort().join(",");
    if (bodyKey !== lastBodyVisibleKey.current) {
      lastBodyVisibleKey.current = bodyKey;
      onBodyVisibleUserKeysRef.current?.(bodyVisible);
    }

    // Rule: character follows the camera — never pan the camera to chase talk.
    // Edge deadzone / off-frame → walk self toward the current view center.
    if (!onViewportCenterXRef.current) return;

    const edgeZone = Math.max(56, size.width * 0.2);

    function inCameraComfort(logicalX: number): boolean {
      const bounds = characterContentBounds(logicalX, span, displayScale);
      if (bounds.right < viewLeft || bounds.left > viewRight) return false;
      if (bounds.center < viewLeft + edgeZone) return false;
      if (bounds.center > viewRight - edgeZone) return false;
      return true;
    }

    const needsFollow = !inCameraComfort(selfLogicalX);

    if (!needsFollow) {
      cameraFollowActiveRef.current = false;
      if (viewportTimer.current) {
        clearTimeout(viewportTimer.current);
        viewportTimer.current = null;
      }

      // Soft approach only toward peers body-visible on THIS screen, and only
      // while the step keeps self inside the camera comfort band.
      if (editing || bodyVisible.length === 0) return;
      const nowSocial = Date.now();
      if (nowSocial - lastSocialSendAt.current < 140) return;

      let bestDx = 0;
      let bestAbs = Infinity;
      for (const key of bodyVisible) {
        const other = actors.find((a) => a.userKey === key);
        if (!other) continue;
        const om = room.memberState[String(other.characterId)];
        if (!om || om.presence !== "active") continue;
        const dx = om.position.x - selfLogicalX;
        const adx = Math.abs(dx);
        if (adx < bestAbs) {
          bestAbs = adx;
          bestDx = dx;
        }
      }
      if (bestAbs <= 1.25) return;

      const socialStep = Math.sign(bestDx) * Math.min(0.35, bestAbs - 1.15);
      if (Math.abs(socialStep) < 0.08) return;
      const nextX = selfLogicalX + socialStep;
      if (!inCameraComfort(nextX)) return;

      lastSocialSendAt.current = nowSocial;
      onViewportCenterXRef.current(nextX);
      return;
    }

    cameraFollowActiveRef.current = true;
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => {
      cameraFollowActiveRef.current = false;
    }, 380);

    const viewCenterPx = scrollX + size.width / 2;
    const cameraWorldX = viewCenterPx - filler;
    const cameraLogicalX = Math.max(
      0,
      Math.min(span, (cameraWorldX / Math.max(1, worldW)) * span),
    );
    const delta = cameraLogicalX - selfLogicalX;
    if (Math.abs(delta) < 0.06) return;

    const now = Date.now();
    // React quickly while scrolling — throttle just enough to avoid floods.
    if (now - lastFollowSendAt.current < 55) return;
    lastFollowSendAt.current = now;

    // Close a chunk of the remaining gap each tick; sprite lerp smooths it.
    const followStep = Math.max(
      0.28,
      Math.min(1.6, Math.abs(delta) * 0.55),
    );
    const step = Math.sign(delta) * Math.min(Math.abs(delta), followStep);
    onViewportCenterXRef.current(selfLogicalX + step);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    reportViewport(event.nativeEvent.contentOffset.x);
  }

  // Re-check visibility when members move (peer walks into/out of view).
  useEffect(() => {
    if (editing || !ready) return;
    reportViewport(scrollXRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on member/layout changes
  }, [room.memberState, actors, ready, editing, worldW, cols, filler, size.width, displayScale]);

  function hitFurniture(localX: number, localY: number): PlacedFurniture | null {
    const h = sizeRef.current.height;
    const { cellPx: cp } = layoutRef.current;
    const fromBottom = h - localY;
    const pieces = [...docRef.current.furniture].sort(
      (a, b) => a.gy - b.gy || a.gx - b.gx,
    );
    for (let i = pieces.length - 1; i >= 0; i -= 1) {
      const item = pieces[i]!;
      const { w, h: dh } = drawnSize(item.sprite, cp);
      // Generous pad — tall/packed sprites were easy to miss; DevTools hitPad adds more.
      const pad = Math.max(10, cp * 0.2) + overrideHitPad(item.sprite, cp);
      const left = item.gx * cp;
      const seamY = layoutRef.current.floorH;
      const floorBaseline = Math.max(4, seamY * 0.14);
      const bottom =
        item.anchor === "wall"
          ? seamY + item.gy * cp
          : floorBaseline + item.gy * cp;
      // Full sprite AABB (+ pad). Not the half-cell placement footprint.
      if (
        localX >= left - pad &&
        localX <= left + w + pad &&
        fromBottom >= bottom - pad &&
        fromBottom <= bottom + dh + pad
      ) {
        return item;
      }
    }
    return null;
  }

  function hitWindow(localX: number, localY: number): PlacedWindow | null {
    const h = sizeRef.current.height;
    const { cellPx: cp, floorH: fh } = layoutRef.current;
    const fromBottom = h - localY;
    for (let i = docRef.current.windows.length - 1; i >= 0; i -= 1) {
      const win = docRef.current.windows[i]!;
      const left = win.gx * cp;
      const bottom = fh + win.gy * cp;
      const w = win.w * cp;
      const winH = win.h * cp;
      if (
        localX >= left &&
        localX <= left + w &&
        fromBottom >= bottom &&
        fromBottom <= bottom + winH
      ) {
        return win;
      }
    }
    return null;
  }

  const hitFurnitureRef = useRef(hitFurniture);
  const hitWindowRef = useRef(hitWindow);
  hitFurnitureRef.current = hitFurniture;
  hitWindowRef.current = hitWindow;

  function windowsOverlap(
    a: { gx: number; gy: number; w: number; h: number },
    b: PlacedWindow,
  ): boolean {
    return !(
      a.gx + a.w <= b.gx ||
      b.gx + b.w <= a.gx ||
      a.gy + a.h <= b.gy ||
      b.gy + b.h <= a.gy
    );
  }

  function applyTileBrush(localX: number, localY: number, erase: boolean) {
    const h = sizeRef.current.height;
    const { cellPx: cp, cols: colsNow, floorRows: floorRowsNow, wallRows: wallRowsNow } =
      layoutRef.current;
    const fromBottom = h - localY;
    const seamY = layoutRef.current.floorH;
    const gx = clampGrid(Math.floor(localX / cp), 0, colsNow - 1);
    const currentTool = toolRef.current;
    const onFloor = fromBottom < seamY;

    const wantFloor =
      erase ||
      currentTool.kind === "erase" ||
      (currentTool.kind === "tile" && currentTool.surface === "floor") ||
      (currentTool.kind === "paint" && SPRITE_BY_ID[currentTool.sprite]?.tileBrush === "floor");

    const wantWall =
      erase ||
      currentTool.kind === "erase" ||
      (currentTool.kind === "tile" && currentTool.surface === "wall") ||
      (currentTool.kind === "paint" && SPRITE_BY_ID[currentTool.sprite]?.tileBrush === "wall");

    if (!erase && currentTool.kind !== "erase") {
      if (wantFloor && !onFloor) {
        onStatusRef.current("Floor tiles only go on the floor");
        return;
      }
      if (wantWall && onFloor) {
        onStatusRef.current("Wall panels only go on the wall");
        return;
      }
    }

    if (onFloor && wantFloor) {
      const gy = clampGrid(Math.floor(fromBottom / cp), 0, floorRowsNow);
      const key = tileKey(gx, gy);
      if (lastPaintKey.current === `f${erase ? "e" : "p"}:${key}`) return;
      lastPaintKey.current = `f${erase ? "e" : "p"}:${key}`;

      const has = hasFloorTile(docRef.current, gx, gy);
      const tileId = inventoryIdForTile("floor");

      if (erase || currentTool.kind === "erase") {
        if (!has) return;
        onChangeDocRef.current(setFloorTile(docRef.current, gx, gy, false));
        if (!docRef.current.floorFill) {
          onChangeInvRef.current(refund(invRef.current, tileId));
        }
        onStatusRef.current(null);
        return;
      }

      if (has) return;
      if (docRef.current.floorFill) {
        const nextInv = spend(invRef.current, tileId);
        if (!nextInv) {
          onStatusRef.current("No floor tiles left in inventory");
          return;
        }
        onChangeInvRef.current(nextInv);
        onChangeDocRef.current(setFloorTile(docRef.current, gx, gy, true));
        onStatusRef.current(null);
        return;
      }
      const nextInv = spend(invRef.current, tileId);
      if (!nextInv) {
        onStatusRef.current("No floor tiles left in inventory");
        return;
      }
      onChangeInvRef.current(nextInv);
      onChangeDocRef.current(setFloorTile(docRef.current, gx, gy, true));
      onStatusRef.current(null);
      return;
    }

    if (!onFloor && wantWall) {
      const gy = clampGrid(Math.floor((fromBottom - seamY) / cp), 0, wallRowsNow);
      const key = tileKey(gx, gy);
      if (lastPaintKey.current === `w${erase ? "e" : "p"}:${key}`) return;
      lastPaintKey.current = `w${erase ? "e" : "p"}:${key}`;

      const has = Boolean(docRef.current.wallTiles[key]);
      const tileId = inventoryIdForTile("wall");

      if (erase || currentTool.kind === "erase") {
        if (!has) return;
        onChangeDocRef.current(setWallTile(docRef.current, gx, gy, false));
        onChangeInvRef.current(refund(invRef.current, tileId));
        onStatusRef.current(null);
        return;
      }

      if (has) return;
      const nextInv = spend(invRef.current, tileId);
      if (!nextInv) {
        onStatusRef.current("No wall panels left in inventory");
        return;
      }
      onChangeInvRef.current(nextInv);
      onChangeDocRef.current(setWallTile(docRef.current, gx, gy, true));
      onStatusRef.current(null);
    }
  }

  function isTileTool(t: EditTool): boolean {
    if (t.kind === "tile") return true;
    if (t.kind === "paint") return SPRITE_BY_ID[t.sprite]?.tileBrush != null;
    return false;
  }

  const suppressEditPress = useRef(false);

  function beginEditAt(locationX: number, locationY: number): "drag" | "paint" | "done" {
    const hit = hitFurnitureRef.current(locationX, locationY);
    const hitWin = hitWindowRef.current(locationX, locationY);
    const currentTool = toolRef.current;
    const { cellPx: cp, maxGx: maxGxNow, wallRows: wallRowsNow } = layoutRef.current;
    const maxWallGyNowResolved = Math.max(1, wallRowsNow - 3);
    lastPaintKey.current = null;
    painting.current = false;

    if (currentTool.kind === "erase") {
      if (hit) {
        const invId = inventoryIdForSprite(hit.sprite);
        onChangeDocRef.current({
          ...docRef.current,
          furniture: docRef.current.furniture.filter((p) => p.id !== hit.id),
        });
        if (invId) onChangeInvRef.current(refund(invRef.current, invId));
        onSelectRef.current(null);
        onStatusRef.current(null);
        return "done";
      }
      if (hitWin) {
        onChangeDocRef.current({
          ...docRef.current,
          windows: docRef.current.windows.filter((w) => w.id !== hitWin.id),
        });
        onChangeInvRef.current(refund(invRef.current, "window_basic"));
        onSelectRef.current(null);
        onStatusRef.current(null);
        return "done";
      }
      painting.current = true;
      applyTileBrush(locationX, locationY, true);
      return "paint";
    }

    if (currentTool.kind === "window") {
      if (hitWin) {
        onSelectRef.current(hitWin.id);
        dragIdRef.current = hitWin.id;
        dragKindRef.current = "window";
        setDragId(hitWin.id);
        setDragKind("window");
        dragOrigin.current = { gx: hitWin.gx, gy: hitWin.gy };
        dragOffsetRef.current = { x: 0, y: 0 };
        setDragOffset({ x: 0, y: 0 });
        return "drag";
      }
      const fromBottom = sizeRef.current.height - locationY;
      const seamY = layoutRef.current.floorH;
      if (fromBottom < seamY) {
        onStatusRef.current("Place windows on the wall");
        return "done";
      }
      const nextInv = spend(invRef.current, "window_basic");
      if (!nextInv) {
        onStatusRef.current("No windows left in inventory");
        return "done";
      }
      const gx = clampGrid(Math.floor(locationX / cp), 0, maxGxNow);
      const gy = clampGrid(
        Math.floor((fromBottom - seamY) / cp),
        1,
        maxWallGyNowResolved,
      );
      const candidate = {
        gx,
        gy,
        w: DEFAULT_WINDOW_W,
        h: DEFAULT_WINDOW_H,
      };
      if (docRef.current.windows.some((w) => windowsOverlap(candidate, w))) {
        onStatusRef.current("Windows can't overlap");
        return "done";
      }
      const next: PlacedWindow = {
        id: createPlacementId("window"),
        ...candidate,
      };
      onChangeInvRef.current(nextInv);
      onChangeDocRef.current({
        ...docRef.current,
        windows: [...docRef.current.windows, next],
      });
      onSelectRef.current(next.id);
      onStatusRef.current(null);
      return "done";
    }

    // Prefer selecting existing furniture/windows over painting through them.
    // (Tile/paint tools used to swallow taps, making pieces look "untappable".)
    if (hit) {
      onSelectRef.current(hit.id);
      dragIdRef.current = hit.id;
      dragKindRef.current = "furniture";
      setDragId(hit.id);
      setDragKind("furniture");
      dragOrigin.current = { gx: hit.gx, gy: hit.gy };
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
      return "drag";
    }
    if (hitWin) {
      onSelectRef.current(hitWin.id);
      dragIdRef.current = hitWin.id;
      dragKindRef.current = "window";
      setDragId(hitWin.id);
      setDragKind("window");
      dragOrigin.current = { gx: hitWin.gx, gy: hitWin.gy };
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
      return "drag";
    }

    if (isTileTool(currentTool)) {
      painting.current = true;
      applyTileBrush(locationX, locationY, false);
      return "paint";
    }

    if (currentTool.kind === "paint") {
      const gx = clampGrid(Math.floor(locationX / cp), 0, maxGxNow);
      const fromBottom = sizeRef.current.height - locationY;
      const seamY = layoutRef.current.floorH;
      const onWallZone = fromBottom >= seamY;
      const meta = SPRITE_BY_ID[currentTool.sprite];
      if (!meta) return "done";

      if (meta.defaultAnchor === "wall" && !onWallZone) {
        onStatusRef.current("Wall items only go on the wall");
        return "done";
      }
      if (meta.defaultAnchor === "floor" && onWallZone) {
        onStatusRef.current("Floor items only go on the floor");
        return "done";
      }

      const { floorRows: floorRowsNow } = layoutRef.current;
      const anchor = meta.defaultAnchor;
      const floorBaseline = Math.max(4, seamY * 0.14);
      const gy =
        anchor === "wall"
          ? clampGrid(Math.floor((fromBottom - seamY) / cp), 0, maxWallGyNowResolved)
          : clampGrid(
              Math.floor((fromBottom - floorBaseline) / cp),
              0,
              Math.max(0, floorRowsNow),
            );

      const check = canPlaceFurniture({
        sprite: currentTool.sprite,
        gx,
        gy,
        anchor,
        furniture: docRef.current.furniture,
        inventory: invRef.current,
      });
      if (!check.ok) {
        onStatusRef.current(check.message ?? "Can't place");
        return "done";
      }
      const invId = inventoryIdForSprite(currentTool.sprite)!;
      const nextInv = spend(invRef.current, invId);
      if (!nextInv) {
        onStatusRef.current("None left in inventory");
        return "done";
      }
      const defaultVisual = overrideActiveVisualStateId(currentTool.sprite);
      const next: PlacedFurniture = {
        id: createPlacementId(currentTool.sprite),
        sprite: currentTool.sprite,
        gx,
        gy,
        anchor,
        packed: true,
        ...(defaultVisual ? { visualStateId: defaultVisual } : {}),
      };
      onChangeInvRef.current(nextInv);
      onChangeDocRef.current({
        ...docRef.current,
        furniture: [...docRef.current.furniture, next],
      });
      onSelectRef.current(next.id);
      onStatusRef.current(`Placed ${meta.label} (tap to unpack)`);
      return "done";
    }

    onSelectRef.current(null);
    return "done";
  }

  const beginEditAtRef = useRef(beginEditAt);
  beginEditAtRef.current = beginEditAt;

  const pan = useRef(
    PanResponder.create({
      // Only claim immediately when grabbing furniture/window — let ScrollView
      // own horizontal pans across empty room / side pads.
      onStartShouldSetPanResponder: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        return Boolean(
          hitFurnitureRef.current(locationX, locationY) ||
            hitWindowRef.current(locationX, locationY),
        );
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        if (dragIdRef.current || painting.current) return true;
        // Horizontal swipe → scroll the room
        if (Math.abs(g.dx) >= Math.abs(g.dy) && Math.abs(g.dx) > 6) return false;
        const kind = toolRef.current.kind;
        if (kind === "move") return false;
        // Paint / erase / tile strokes (mostly vertical or short moves)
        return Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4;
      },
      onPanResponderTerminationRequest: () =>
        !dragIdRef.current && !painting.current,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        const mode = beginEditAtRef.current(locationX, locationY);
        if (mode === "drag" || mode === "paint") setPanLocked(true);
      },
      onPanResponderMove: (e: GestureResponderEvent, gesture: PanResponderGestureState) => {
        if (painting.current) {
          applyTileBrush(
            e.nativeEvent.locationX,
            e.nativeEvent.locationY,
            toolRef.current.kind === "erase",
          );
          return;
        }
        if (!dragIdRef.current) return;
        const next = { x: gesture.dx, y: gesture.dy };
        dragOffsetRef.current = next;
        setDragOffset(next);
      },
      onPanResponderRelease: () => {
        setPanLocked(false);
        painting.current = false;
        lastPaintKey.current = null;
        const id = dragIdRef.current;
        const origin = dragOrigin.current;
        const offset = dragOffsetRef.current;
        const kind = dragKindRef.current;
        const { cellPx: cp, maxGx: maxGxNow, wallRows: wallRowsRelease } =
          layoutRef.current;
        const maxWallGyNow = Math.max(1, wallRowsRelease - 3);

        if (id && origin && offset && kind === "furniture") {
          const item = docRef.current.furniture.find((p) => p.id === id);
          if (item) {
            const nextGx = clampGrid(origin.gx + snapToGrid(offset.x, cp), 0, maxGxNow);
            const { floorRows: floorRowsNow } = layoutRef.current;
            const nextGy =
              item.anchor === "wall"
                ? clampGrid(origin.gy + -snapToGrid(offset.y, cp), 0, maxWallGyNow)
                : clampGrid(
                    origin.gy + -snapToGrid(offset.y, cp),
                    0,
                    Math.max(0, floorRowsNow),
                  );

            const check = canPlaceFurniture({
              sprite: item.sprite,
              gx: nextGx,
              gy: nextGy,
              anchor: item.anchor,
              furniture: docRef.current.furniture,
              ignoreId: id,
              inventory: invRef.current,
              skipInventory: true,
            });
            if (!check.ok) {
              onStatusRef.current(check.message ?? "Collision");
            } else {
              onChangeDocRef.current({
                ...docRef.current,
                furniture: docRef.current.furniture.map((p) =>
                  p.id === id ? { ...p, gx: nextGx, gy: nextGy } : p,
                ),
              });
              onStatusRef.current(null);
            }
          }
        }

        if (id && origin && offset && kind === "window") {
          const win = docRef.current.windows.find((w) => w.id === id);
          if (win) {
            const nextGx = clampGrid(origin.gx + snapToGrid(offset.x, cp), 0, maxGxNow);
            const nextGy = clampGrid(
              origin.gy + -snapToGrid(offset.y, cp),
              0,
              maxWallGyNow,
            );
            const candidate = { gx: nextGx, gy: nextGy, w: win.w, h: win.h };
            const blocked = docRef.current.windows.some(
              (w) => w.id !== id && windowsOverlap(candidate, w),
            );
            if (blocked) {
              onStatusRef.current("Windows can't overlap");
            } else {
              onChangeDocRef.current({
                ...docRef.current,
                windows: docRef.current.windows.map((w) =>
                  w.id === id ? { ...w, gx: nextGx, gy: nextGy } : w,
                ),
              });
              onStatusRef.current(null);
            }
          }
        }

        dragIdRef.current = null;
        dragKindRef.current = null;
        dragOrigin.current = null;
        dragOffsetRef.current = null;
        setDragId(null);
        setDragKind(null);
        setDragOffset(null);
      },
      onPanResponderTerminate: () => {
        setPanLocked(false);
        painting.current = false;
        lastPaintKey.current = null;
        dragIdRef.current = null;
        dragKindRef.current = null;
        dragOrigin.current = null;
        dragOffsetRef.current = null;
        setDragId(null);
        setDragKind(null);
        setDragOffset(null);
      },
    }),
  ).current;

  const wallTileList = useMemo(
    () => Object.keys(document.wallTiles).map(parseTileKey),
    [document.wallTiles],
  );

  const sideWallBg = shadeHex(theme.wallTop, 0.86);

  const sideWall = (side: "left" | "right") => (
    <SideLimitPad
      side={side}
      width={filler}
      wallColor={theme.wallTop}
      accentColor={theme.accent}
    />
  );

  return (
    <View
      style={[styles.stage, { backgroundColor: sideWallBg }]}
      onLayout={onLayoutChange}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        style={styles.scroller}
        contentContainerStyle={[styles.scrollContent, { minHeight: size.height || undefined }]}
        showsHorizontalScrollIndicator={canScroll}
        scrollEnabled={!panLocked}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          suppressEditPress.current = true;
        }}
        onMomentumScrollBegin={() => {
          suppressEditPress.current = true;
        }}
        scrollEventThrottle={16}
        bounces={canScroll}
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
        directionalLockEnabled
      >
        <View style={[styles.row, { width: contentW || "100%", height: size.height || "100%" }]}>
          {sideWall("left")}

          <Pressable
            style={[styles.world, { width: worldW }]}
            disabled={!editing}
            onPress={(e) => {
              if (!editing) return;
              if (suppressEditPress.current) {
                suppressEditPress.current = false;
                return;
              }
              if (panLocked || dragId) return;
              const { locationX, locationY } = e.nativeEvent;
              beginEditAt(locationX, locationY);
            }}
            {...(editing ? pan.panHandlers : {})}
          >
          <View
            style={[
              styles.wall,
              { backgroundColor: theme.wallTop, bottom: floorH },
            ]}
          />

          {ready
            ? wallTileList.map(({ gx, gy }) => (
                <View
                  key={`wt-${gx}-${gy}`}
                  style={{
                    position: "absolute",
                    left: gx * cellPx,
                    bottom: floorH + gy * cellPx,
                    zIndex: 3,
                    opacity: 0.95,
                  }}
                  pointerEvents="none"
                >
                  {(() => {
                    const crop = tileCrop("wallStripe");
                    return crop ? (
                      <AtlasSprite
                        crop={crop}
                        width={cellPx}
                        height={cellPx * 3}
                      />
                    ) : (
                      <PixelImage
                        source={FURNITURE.wallStripe}
                        width={cellPx}
                        height={cellPx * 3}
                      />
                    );
                  })()}
                </View>
              ))
            : null}

          {ready
            ? document.windows.map((win) => {
                const left = win.gx * cellPx;
                const bottom = floorH + win.gy * cellPx;
                const w = win.w * cellPx;
                const h = win.h * cellPx;
                const isDrag = dragKind === "window" && dragId === win.id;
                return (
                  <View
                    key={win.id}
                    style={[
                      styles.window,
                      {
                        left: left + (isDrag && dragOffset ? dragOffset.x : 0),
                        bottom: bottom - (isDrag && dragOffset ? dragOffset.y : 0),
                        width: w,
                        height: h,
                        top: undefined,
                      },
                      editing && selectedId === win.id && styles.windowSelected,
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.windowMullion} />
                  </View>
                );
              })
            : null}

          <View
            style={[
              styles.floor,
              { height: floorH, backgroundColor: theme.floor },
            ]}
          >
            {ready
              ? Array.from({ length: floorRows }, (_, row) =>
                  Array.from({ length: cols }, (_, col) => {
                    if (!hasFloorTile(document, col, row)) return null;
                    return (
                      <View
                        key={`ft-${row}-${col}`}
                        style={{
                          position: "absolute",
                          left: col * cellPx,
                          bottom: row * cellPx,
                          opacity: 0.85,
                        }}
                      >
                        {(() => {
                          const crop = tileCrop("floor");
                          return crop ? (
                            <AtlasSprite
                              crop={crop}
                              width={cellPx}
                              height={cellPx}
                            />
                          ) : (
                            <PixelImage
                              source={FURNITURE.floor}
                              width={cellPx}
                              height={cellPx}
                            />
                          );
                        })()}
                      </View>
                    );
                  }),
                )
              : null}
          </View>
          <View
            style={[
              styles.baseboard,
              {
                bottom: floorH + 2,
                backgroundColor: theme.accent,
              },
            ]}
          />

          {editing && ready
            ? Array.from({ length: cols }, (_, col) => (
                <View
                  key={`vg-${col}`}
                  pointerEvents="none"
                  style={[
                    styles.gridLineV,
                    { left: col * cellPx, opacity: col % 2 === 0 ? 0.2 : 0.08 },
                  ]}
                />
              ))
            : null}

          {ready
            ? sorted.map((item) => (
                <FurniturePiece
                  key={item.id}
                  item={item}
                  stageHeight={size.height}
                  cellPx={cellPx}
                  selected={editing && selectedId === item.id}
                  dragOffset={
                    dragKind === "furniture" && dragId === item.id ? dragOffset : null
                  }
                  onTapPacked={handleTapPacked}
                  editing={editing}
                  careIndicator={
                    !editing && !item.packed && furnitureCare
                      ? careIndicatorForSprite(item.sprite, furnitureCare)
                      : null
                  }
                />
              ))
            : null}

          {!editing && ready
            ? actors.map((actor) => {
                const member = room.memberState[String(actor.characterId)];
                if (!member) return null;
                let bubbleNudgeX = 0;
                let bubbleAlign: "left" | "right" | "center" = "center";
                let faceTowardX: number | null = null;
                for (const other of actors) {
                  if (other.characterId === actor.characterId) continue;
                  const om = room.memberState[String(other.characterId)];
                  if (!om || om.presence === "sleeping") continue;
                  const dx = member.position.x - om.position.x;
                  // Nearby speakers: left person → left column, right → right
                  // (messaging-style stacks that stay readable above their heads).
                  if (Math.abs(dx) < 3.4) {
                    bubbleAlign = dx <= 0 ? "left" : "right";
                    bubbleNudgeX = dx <= 0 ? -10 : 10;
                  }
                  // Only face someone you can actually see on this screen.
                  // (Peers walking to you is driven by their own client/camera.)
                  const otherVisible =
                    !actor.isSelf || visibleKeysRef.current.has(other.userKey);
                  if (
                    otherVisible &&
                    member.presence === "active" &&
                    Math.abs(dx) < 3.2 &&
                    Math.abs(member.position.y - om.position.y) < 2.2
                  ) {
                    faceTowardX = om.position.x;
                    break;
                  }
                }
                return (
                  <CharacterSprite
                    key={String(actor.characterId)}
                    name={actor.name}
                    appearance={actor.appearance}
                    member={member}
                    isSelf={actor.isSelf}
                    stageWidth={worldW}
                    stageHeight={size.height}
                    floorRatio={floorRatio}
                    worldSpanX={cols}
                    displayScale={displayScale}
                    bubbles={bubblesByUserKey[actor.userKey] ?? []}
                    bubbleNudgeX={bubbleNudgeX}
                    bubbleAlign={bubbleAlign}
                    faceTowardX={faceTowardX}
                  />
                );
              })
            : null}
          
          {/* Dirt overlay */}
          {dirtLevel > 0 && ready && (
            <DirtOverlay
              dirtLevel={dirtLevel}
              stageWidth={worldW}
              stageHeight={size.height}
            />
          )}
          </Pressable>

          {sideWall("right")}
        </View>
      </ScrollView>

      {editing ? (
        <View style={styles.expandClusterLeft}>
          <Pressable
            style={[
              styles.plusBtn,
              document.expansionsLeft >= MAX_SIDE_EXPANSIONS && styles.expandBtnDisabled,
            ]}
            disabled={document.expansionsLeft >= MAX_SIDE_EXPANSIONS}
            onPress={() => onRequestExpand("left")}
            accessibilityLabel={`Expand room left for ${expandCostForSide(document.expansionsLeft)} coins`}
            accessibilityRole="button"
          >
            <Text style={styles.plusBtnSymbolOn}>+</Text>
            <Text style={styles.plusBtnLabelOn}>
              {expandCostForSide(document.expansionsLeft)}c
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.minusBtn,
              document.expansionsLeft <= 0 && styles.expandBtnDisabled,
            ]}
            disabled={document.expansionsLeft <= 0}
            onPress={() => onRequestShrink("left")}
            accessibilityLabel={`Refund left expansion for ${expandCostForSide(Math.max(0, document.expansionsLeft - 1))} coins`}
            accessibilityRole="button"
          >
            <Text style={styles.minusBtnSymbol}>−</Text>
            <Text style={styles.minusBtnLabel}>
              {expandCostForSide(Math.max(0, document.expansionsLeft - 1))}c
            </Text>
          </Pressable>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.expandClusterRight}>
          <Pressable
            style={[
              styles.plusBtn,
              document.expansionsRight >= MAX_SIDE_EXPANSIONS && styles.expandBtnDisabled,
            ]}
            disabled={document.expansionsRight >= MAX_SIDE_EXPANSIONS}
            onPress={() => onRequestExpand("right")}
            accessibilityLabel={`Expand room right for ${expandCostForSide(document.expansionsRight)} coins`}
            accessibilityRole="button"
          >
            <Text style={styles.plusBtnSymbolOn}>+</Text>
            <Text style={styles.plusBtnLabelOn}>
              {expandCostForSide(document.expansionsRight)}c
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.minusBtn,
              document.expansionsRight <= 0 && styles.expandBtnDisabled,
            ]}
            disabled={document.expansionsRight <= 0}
            onPress={() => onRequestShrink("right")}
            accessibilityLabel={`Refund right expansion for ${expandCostForSide(Math.max(0, document.expansionsRight - 1))} coins`}
            accessibilityRole="button"
          >
            <Text style={styles.minusBtnSymbol}>−</Text>
            <Text style={styles.minusBtnLabel}>
              {expandCostForSide(Math.max(0, document.expansionsRight - 1))}c
            </Text>
          </Pressable>
        </View>
      ) : null}

      <UnpackingMiniGame
        visible={unpackingFurniture != null}
        furniture={unpackingFurniture}
        onComplete={handleUnpackComplete}
        onCancel={handleUnpackCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
    minHeight: 0,
    position: "relative",
    overflow: "hidden",
  },
  scroller: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  sideWall: {
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  sideWallFrontTrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
    zIndex: 2,
  },
  sideWallEdgeRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(26, 34, 28, 0.18)",
  },
  sideWallEdgeLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(26, 34, 28, 0.18)",
  },
  world: {
    height: "100%",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  homeChunk: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  wall: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  window: {
    position: "absolute",
    backgroundColor: "#9ec5dd",
    borderWidth: 3,
    borderColor: colors.borderStrong,
    zIndex: 5,
  },
  windowSelected: {
    borderColor: colors.accent,
  },
  windowMullion: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 3,
    marginLeft: -1.5,
    backgroundColor: colors.borderStrong,
  },
  baseboard: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 12,
    zIndex: 8,
  },
  floor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    overflow: "hidden",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.borderStrong,
    zIndex: 1,
  },
  expandClusterLeft: {
    position: "absolute",
    left: 8,
    top: "50%",
    marginTop: -72,
    zIndex: 50,
    gap: 8,
    alignItems: "center",
  },
  expandClusterRight: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -72,
    zIndex: 50,
    gap: 8,
    alignItems: "center",
  },
  plusBtn: {
    width: 56,
    height: 64,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  minusBtn: {
    width: 56,
    height: 64,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  expandBtnDisabled: {
    opacity: 0.35,
  },
  plusBtnSymbolOn: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.surfaceRaised,
    lineHeight: 24,
  },
  plusBtnLabelOn: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.surfaceRaised,
    letterSpacing: 0.3,
    textTransform: "lowercase",
  },
  minusBtnSymbol: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 24,
  },
  minusBtnLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0.3,
    textTransform: "lowercase",
  },
});
