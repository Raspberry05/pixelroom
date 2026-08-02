import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";
import {
  INTERIOR_ATLAS_H,
  INTERIOR_ATLAS_W,
  SIT_SEAT_H_CELLS,
  SIT_SEAT_W_CELLS,
  type FurnitureItemDefinition,
  type InteractionHotspot,
  type SittingPosition,
} from "../../data/devTools";
import {
  DEFAULT_TV_OVERLAY,
  findVisualState,
} from "../../data/furnitureVisual";
import { GRID_CELL } from "../../data/roomLayout";
import { OverlayArt } from "../OverlayArt";
import { PixelImage, pixelatedImageStyle } from "../PixelImage";
import { resolveOverlayArt } from "../../data/overlayFrames";

const DEFAULT_ATLAS_SRC = require("../../assets/interior/interior_free.png");

export type WorkstationTool =
  | "pan"
  | "crop"
  | "hitbox"
  | "sit"
  | "interact"
  | "overlay";

/** Snap sit placement to quarter-cells so dragging feels smooth. */
function snapSit(n: number): number {
  return Math.round(n * 4) / 4;
}

function sitHitTest(
  cellX: number,
  cellY: number,
  positions: SittingPosition[],
): SittingPosition | undefined {
  // Topmost (last) seat under the pointer wins.
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const p = positions[i]!;
    if (
      cellX >= p.x &&
      cellX < p.x + SIT_SEAT_W_CELLS &&
      cellY >= p.y &&
      cellY < p.y + SIT_SEAT_H_CELLS
    ) {
      return p;
    }
  }
  return undefined;
}

type Props = {
  item: FurnitureItemDefinition;
  onChange: (updates: Partial<FurnitureItemDefinition>) => void;
  /** When set, switch to this tool once (e.g. from Capabilities → Place overlay). */
  requestedTool?: WorkstationTool | null;
  onRequestedToolConsumed?: () => void;
  /** Atlas image (defaults to interior furniture atlas). */
  atlasSource?: ImageSourcePropType;
  atlasWidth?: number;
  atlasHeight?: number;
  /** Restrict toolbar — e.g. pan+crop for grocery/clothes/dishes. */
  enabledTools?: WorkstationTool[];
};

type DragKind =
  | { type: "pan"; startX: number; startY: number; origPanX: number; origPanY: number }
  | {
      type: "crop-move" | "crop-resize";
      startX: number;
      startY: number;
      ox: number;
      oy: number;
      ow: number;
      oh: number;
    }
  | {
      type: "hit-pad";
      startX: number;
      startY: number;
      /** Atlas pointer at drag start — pad is distance outside crop. */
      startAx: number;
      startAy: number;
      origPad: number;
    }
  | {
      type: "hit-grid";
      startX: number;
      startY: number;
      origW: number;
      origH: number;
    }
  | {
      type: "sit-move";
      id: string;
      startX: number;
      startY: number;
      ox: number;
      oy: number;
    }
  | {
      type: "sit-tap";
      startX: number;
      startY: number;
      cellX: number;
      cellY: number;
    }
  | {
      type: "interact-move" | "interact-resize";
      id: string;
      startX: number;
      startY: number;
      ox: number;
      oy: number;
      ow: number;
      oh: number;
    }
  | {
      type: "interact-create";
      startX: number;
      startY: number;
      atlasX: number;
      atlasY: number;
    }
  | {
      type: "overlay-move" | "overlay-resize";
      startX: number;
      startY: number;
      ox: number;
      oy: number;
      ow: number;
      oh: number;
    };

const BASE_TOOLS: { id: WorkstationTool; label: string }[] = [
  { id: "pan", label: "Pan" },
  { id: "crop", label: "Crop" },
  { id: "hitbox", label: "Hitbox" },
  { id: "sit", label: "Sit" },
  { id: "interact", label: "Interact" },
];

const DIR_ARROW: Record<SittingPosition["direction"], string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export function FurnitureWorkstation({
  item,
  onChange,
  requestedTool = null,
  onRequestedToolConsumed,
  atlasSource = DEFAULT_ATLAS_SRC,
  atlasWidth = INTERIOR_ATLAS_W,
  atlasHeight = INTERIOR_ATLAS_H,
  enabledTools,
}: Props) {
  const atlasW = Math.max(1, atlasWidth);
  const atlasH = Math.max(1, atlasHeight);
  const [tool, setTool] = useState<WorkstationTool>("crop");
  const [zoom, setZoom] = useState(4);
  const [panX, setPanX] = useState(8);
  const [panY, setPanY] = useState(8);
  const [selectedSitId, setSelectedSitId] = useState<string | null>(null);
  const [selectedInteractId, setSelectedInteractId] = useState<string | null>(
    null,
  );
  const dragRef = useRef<DragKind | null>(null);
  const itemRef = useRef(item);
  itemRef.current = item;

  useEffect(() => {
    if (!requestedTool) return;
    setTool(requestedTool);
    onRequestedToolConsumed?.();
  }, [requestedTool, onRequestedToolConsumed]);
  const [draftInteract, setDraftInteract] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const cropX = Math.max(0, item.spriteX ?? 0);
  const cropY = Math.max(0, item.spriteY ?? 0);
  const cropW = Math.max(1, item.spriteWidth ?? 16);
  const cropH = Math.max(1, item.spriteHeight ?? 16);
  const hitPad = item.hitPad ?? 0;
  const hasVisualStates = (item.visualStates?.length ?? 0) > 0;
  const overlayPlacement =
    item.overlayPlacement ??
    (hasVisualStates || item.sprite === "tv" ? DEFAULT_TV_OVERLAY : null);
  const previewState = findVisualState(
    item.visualStates,
    item.activeVisualStateId,
  );
  const overlayFrames =
    previewState?.kind === "sequence" ? previewState.frames ?? [] : [];
  const [animFrame, setAnimFrame] = useState(0);

  useEffect(() => {
    setAnimFrame(0);
  }, [previewState?.id, overlayFrames.length]);

  useEffect(() => {
    if (overlayFrames.length < 2) return;
    const ms = previewState?.frameMs ?? 180;
    const id = setInterval(() => {
      setAnimFrame((i) => (i + 1) % overlayFrames.length);
    }, ms);
    return () => clearInterval(id);
  }, [overlayFrames.length, previewState?.frameMs, previewState?.id]);

  const tools = useMemo(() => {
    if (enabledTools?.length) {
      const labels: Record<WorkstationTool, string> = {
        pan: "Pan",
        crop: "Crop",
        hitbox: "Hitbox",
        sit: "Sit",
        interact: "Interact",
        overlay: "Overlay",
      };
      return enabledTools.map((id) => ({ id, label: labels[id] }));
    }
    if (!hasVisualStates) return BASE_TOOLS;
    return [...BASE_TOOLS, { id: "overlay" as const, label: "Overlay" }];
  }, [hasVisualStates, enabledTools]);

  useEffect(() => {
    if (tools.some((t) => t.id === tool)) return;
    if (tools[0]) setTool(tools[0].id);
  }, [tools, tool]);

  const fitCrop = useCallback(() => {
    setZoom(6);
    setPanX(24 - cropX * 6);
    setPanY(24 - cropY * 6);
  }, [cropX, cropY]);

  const atlasFromEvent = useCallback(
    (e: GestureResponderEvent) => {
      const native = e.nativeEvent as {
        locationX: number;
        locationY: number;
      };
      return {
        x: (native.locationX - panX) / zoom,
        y: (native.locationY - panY) / zoom,
      };
    },
    [panX, panY, zoom],
  );

  const onPointerDown = (e: GestureResponderEvent) => {
    if (Platform.OS === "web") {
      (e.nativeEvent as unknown as { preventDefault?: () => void }).preventDefault?.();
    }
    const { x: ax, y: ay } = atlasFromEvent(e);
    const sx = e.nativeEvent.pageX;
    const sy = e.nativeEvent.pageY;

    if (tool === "pan") {
      dragRef.current = {
        type: "pan",
        startX: sx,
        startY: sy,
        origPanX: panX,
        origPanY: panY,
      };
      return;
    }

    if (tool === "crop") {
      const nearR = Math.abs(ax - (cropX + cropW)) < 3 / zoom;
      const nearB = Math.abs(ay - (cropY + cropH)) < 3 / zoom;
      if (nearR || nearB) {
        dragRef.current = {
          type: "crop-resize",
          startX: sx,
          startY: sy,
          ox: cropX,
          oy: cropY,
          ow: cropW,
          oh: cropH,
        };
      } else {
        dragRef.current = {
          type: "crop-move",
          startX: sx,
          startY: sy,
          ox: cropX,
          oy: cropY,
          ow: cropW,
          oh: cropH,
        };
      }
      return;
    }

    if (tool === "hitbox") {
      // All coords are atlas pixels (not grid cells).
      const edge = Math.max(2, 10 / zoom);
      const footR = cropX + item.gridWidth * GRID_CELL;
      const footB = cropY + item.gridHeight * GRID_CELL;
      const padL = cropX - hitPad;
      const padT = cropY - hitPad;
      const padR = cropX + cropW + hitPad;
      const padB = cropY + cropH + hitPad;
      const near = (a: number, b: number) => Math.abs(a - b) <= edge;
      const onFootEdge =
        (near(ax, footR) && ay >= cropY - edge && ay <= footB + edge) ||
        (near(ay, footB) && ax >= cropX - edge && ax <= footR + edge);
      const onPadEdge =
        near(ax, padR) ||
        near(ay, padB) ||
        near(ax, padL) ||
        near(ay, padT);
      const inFoot =
        ax >= cropX && ax <= footR && ay >= cropY && ay <= footB;
      const outsideCrop =
        ax < cropX ||
        ay < cropY ||
        ax > cropX + cropW ||
        ay > cropY + cropH;

      // Footprint edges/interior → grid size; pad ring or outside crop → tap pad.
      if (onFootEdge || (inFoot && !onPadEdge)) {
        dragRef.current = {
          type: "hit-grid",
          startX: sx,
          startY: sy,
          origW: item.gridWidth,
          origH: item.gridHeight,
        };
      } else if (onPadEdge || outsideCrop || !inFoot) {
        dragRef.current = {
          type: "hit-pad",
          startX: sx,
          startY: sy,
          startAx: ax,
          startAy: ay,
          origPad: hitPad,
        };
      } else {
        dragRef.current = {
          type: "hit-grid",
          startX: sx,
          startY: sy,
          origW: item.gridWidth,
          origH: item.gridHeight,
        };
      }
      return;
    }

    if (tool === "sit") {
      const cellX = (ax - cropX) / GRID_CELL;
      const cellY = (ay - cropY) / GRID_CELL;
      const hit = sitHitTest(cellX, cellY, item.sittingPositions);
      if (hit) {
        setSelectedSitId(hit.id);
        dragRef.current = {
          type: "sit-move",
          id: hit.id,
          startX: sx,
          startY: sy,
          ox: hit.x,
          oy: hit.y,
        };
      } else {
        // Tap-to-add: only create on release if the pointer barely moved.
        dragRef.current = {
          type: "sit-tap",
          startX: sx,
          startY: sy,
          cellX,
          cellY,
        };
      }
      return;
    }

    if (tool === "overlay" && overlayPlacement) {
      const ox = cropX + overlayPlacement.offsetX;
      const oy = cropY + overlayPlacement.offsetY;
      const ow = overlayPlacement.width;
      const oh = overlayPlacement.height;
      const edge = Math.max(2, 10 / zoom);
      const nearR = Math.abs(ax - (ox + ow)) <= edge;
      const nearB = Math.abs(ay - (oy + oh)) <= edge;
      dragRef.current = {
        type: nearR || nearB ? "overlay-resize" : "overlay-move",
        startX: sx,
        startY: sy,
        ox: overlayPlacement.offsetX,
        oy: overlayPlacement.offsetY,
        ow,
        oh,
      };
      return;
    }

    if (tool === "interact") {
      const cellX = (ax - cropX) / GRID_CELL;
      const cellY = (ay - cropY) / GRID_CELL;
      const hit = item.interactionHotspots.find(
        (h) =>
          cellX >= h.x &&
          cellX <= h.x + h.width &&
          cellY >= h.y &&
          cellY <= h.y + h.height,
      );
      if (hit) {
        setSelectedInteractId(hit.id);
        const nearR = Math.abs(cellX - (hit.x + hit.width)) < 0.35;
        const nearB = Math.abs(cellY - (hit.y + hit.height)) < 0.35;
        dragRef.current = {
          type: nearR || nearB ? "interact-resize" : "interact-move",
          id: hit.id,
          startX: sx,
          startY: sy,
          ox: hit.x,
          oy: hit.y,
          ow: hit.width,
          oh: hit.height,
        };
      } else {
        dragRef.current = {
          type: "interact-create",
          startX: sx,
          startY: sy,
          atlasX: cellX,
          atlasY: cellY,
        };
        setDraftInteract({ x: cellX, y: cellY, w: 0.2, h: 0.2 });
      }
    }
  };

  const onPointerMove = (e: GestureResponderEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const sx = e.nativeEvent.pageX;
    const sy = e.nativeEvent.pageY;
    const dx = (sx - drag.startX) / zoom;
    const dy = (sy - drag.startY) / zoom;

    if (drag.type === "pan") {
      setPanX(drag.origPanX + (sx - drag.startX));
      setPanY(drag.origPanY + (sy - drag.startY));
      return;
    }
    if (drag.type === "crop-move") {
      onChange({
        spriteX: Math.max(0, Math.round(drag.ox + dx)),
        spriteY: Math.max(0, Math.round(drag.oy + dy)),
      });
      return;
    }
    if (drag.type === "crop-resize") {
      onChange({
        spriteWidth: Math.max(1, Math.round(drag.ow + dx)),
        spriteHeight: Math.max(1, Math.round(drag.oh + dy)),
      });
      return;
    }
    if (drag.type === "hit-pad") {
      // Pad = how far the pointer sits outside the crop rect (uniform expand).
      const ax = drag.startAx + dx;
      const ay = drag.startAy + dy;
      const outward = Math.max(
        cropX - ax,
        cropY - ay,
        ax - (cropX + cropW),
        ay - (cropY + cropH),
        0,
      );
      onChange({
        hitPad: Math.max(0, Math.round(outward)),
      });
      return;
    }
    if (drag.type === "hit-grid") {
      onChange({
        gridWidth: Math.max(1, Math.round(drag.origW + dx / GRID_CELL)),
        gridHeight: Math.max(1, Math.round(drag.origH + dy / GRID_CELL)),
      });
      return;
    }
    if (drag.type === "overlay-move") {
      onChange({
        overlayPlacement: {
          offsetX: Math.round(drag.ox + dx),
          offsetY: Math.round(drag.oy + dy),
          width: drag.ow,
          height: drag.oh,
        },
      });
      return;
    }
    if (drag.type === "overlay-resize") {
      onChange({
        overlayPlacement: {
          offsetX: drag.ox,
          offsetY: drag.oy,
          width: Math.max(1, Math.round(drag.ow + dx)),
          height: Math.max(1, Math.round(drag.oh + dy)),
        },
      });
      return;
    }
    if (drag.type === "sit-move") {
      const nextX = snapSit(drag.ox + dx / GRID_CELL);
      const nextY = snapSit(drag.oy + dy / GRID_CELL);
      onChange({
        sittingPositions: itemRef.current.sittingPositions.map((p) =>
          p.id === drag.id ? { ...p, x: nextX, y: nextY } : p,
        ),
      });
      return;
    }
    if (drag.type === "sit-tap") {
      // Convert a drag that leaves the tap threshold into a move of a new seat.
      const dist = Math.hypot(sx - drag.startX, sy - drag.startY);
      if (dist > 6) {
        const newPos: SittingPosition = {
          id: `sit_${Date.now()}`,
          x: snapSit(drag.cellX - SIT_SEAT_W_CELLS / 2),
          y: snapSit(drag.cellY - SIT_SEAT_H_CELLS / 2),
          direction: "down",
        };
        onChange({
          sittingPositions: [...itemRef.current.sittingPositions, newPos],
        });
        setSelectedSitId(newPos.id);
        dragRef.current = {
          type: "sit-move",
          id: newPos.id,
          startX: drag.startX,
          startY: drag.startY,
          ox: newPos.x,
          oy: newPos.y,
        };
      }
      return;
    }
    if (drag.type === "interact-move" || drag.type === "interact-resize") {
      onChange({
        interactionHotspots: item.interactionHotspots.map((h) => {
          if (h.id !== drag.id) return h;
          if (drag.type === "interact-move") {
            return {
              ...h,
              x: Math.round((drag.ox + dx / GRID_CELL) * 10) / 10,
              y: Math.round((drag.oy + dy / GRID_CELL) * 10) / 10,
            };
          }
          return {
            ...h,
            width: Math.max(0.5, Math.round((drag.ow + dx / GRID_CELL) * 10) / 10),
            height: Math.max(0.5, Math.round((drag.oh + dy / GRID_CELL) * 10) / 10),
          };
        }),
      });
      return;
    }
    if (drag.type === "interact-create") {
      const w = Math.max(0.5, dx / GRID_CELL);
      const h = Math.max(0.5, dy / GRID_CELL);
      setDraftInteract({
        x: drag.atlasX,
        y: drag.atlasY,
        w,
        h,
      });
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.type === "sit-tap") {
      const newPos: SittingPosition = {
        id: `sit_${Date.now()}`,
        x: snapSit(drag.cellX - SIT_SEAT_W_CELLS / 2),
        y: snapSit(drag.cellY - SIT_SEAT_H_CELLS / 2),
        direction: "down",
      };
      onChange({
        sittingPositions: [...itemRef.current.sittingPositions, newPos],
      });
      setSelectedSitId(newPos.id);
    }
    if (drag?.type === "interact-create" && draftInteract) {
      const hotspot: InteractionHotspot = {
        id: `int_${Date.now()}`,
        x: Math.round(draftInteract.x * 10) / 10,
        y: Math.round(draftInteract.y * 10) / 10,
        width: Math.max(0.5, Math.round(draftInteract.w * 10) / 10),
        height: Math.max(0.5, Math.round(draftInteract.h * 10) / 10),
        action: "use",
      };
      onChange({
        interactionHotspots: [...itemRef.current.interactionHotspots, hotspot],
      });
      setSelectedInteractId(hotspot.id);
    }
    setDraftInteract(null);
  };

  const addSitAtCropCenter = () => {
    const cx = cropW / GRID_CELL / 2 - SIT_SEAT_W_CELLS / 2;
    const cy = cropH / GRID_CELL / 2 - SIT_SEAT_H_CELLS / 2;
    const newPos: SittingPosition = {
      id: `sit_${Date.now()}`,
      x: snapSit(Math.max(0, cx)),
      y: snapSit(Math.max(0, cy)),
      direction: "down",
    };
    onChange({
      sittingPositions: [...item.sittingPositions, newPos],
    });
    setSelectedSitId(newPos.id);
    setTool("sit");
  };

  const selectedSit = item.sittingPositions.find((p) => p.id === selectedSitId);
  const selectedInteract = item.interactionHotspots.find(
    (h) => h.id === selectedInteractId,
  );

  const previewScale = 6;
  // Pan = overview (all layers). Active tool = only that layer’s outlines.
  const showCropOverlay = tool === "pan" || tool === "crop";
  const showHitOverlay = tool === "pan" || tool === "hitbox";
  const showSitOverlay = tool === "pan" || tool === "sit";
  const showInteractOverlay = tool === "pan" || tool === "interact";
  const showOverlayLayer = tool === "pan" || tool === "overlay";
  const legend = useMemo(() => {
    const all = [
      { id: "crop" as const, c: "#3B82F6", t: "Crop" },
      { id: "hitbox" as const, c: "#F59E0B", t: "Hitbox / pad" },
      { id: "sit" as const, c: "#22C55E", t: "Sit" },
      { id: "interact" as const, c: "#A855F7", t: "Interact" },
      { id: "overlay" as const, c: "#EC4899", t: "Screen overlay" },
    ];
    const allowed = enabledTools?.length
      ? all.filter((l) => enabledTools.includes(l.id))
      : hasVisualStates
        ? all
        : all.filter((l) => l.id !== "overlay");
    if (tool === "pan") return allowed;
    return allowed.filter((l) => l.id === tool);
  }, [tool, hasVisualStates, enabledTools]);
  const animSeqFrame = overlayFrames[animFrame];
  const animArt = animSeqFrame ? resolveOverlayArt(animSeqFrame) : null;
  const footR = cropX + item.gridWidth * GRID_CELL;
  const footB = cropY + item.gridHeight * GRID_CELL;
  const padL = cropX - hitPad;
  const padT = cropY - hitPad;
  const padR = cropX + cropW + hitPad;
  const padB = cropY + cropH + hitPad;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        {tools.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.toolBtn, tool === t.id && styles.toolBtnActive]}
            onPress={() => setTool(t.id)}
          >
            <Text
              style={[
                styles.toolBtnText,
                tool === t.id && styles.toolBtnTextActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.toolBtn} onPress={fitCrop}>
          <Text style={styles.toolBtnText}>Fit crop</Text>
        </Pressable>
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>Zoom {zoom}×</Text>
          <Pressable
            style={styles.toolBtn}
            onPress={() => setZoom((z) => Math.max(2, z - 1))}
          >
            <Text style={styles.toolBtnText}>−</Text>
          </Pressable>
          <Pressable
            style={styles.toolBtn}
            onPress={() => setZoom((z) => Math.min(12, z + 1))}
          >
            <Text style={styles.toolBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
      {tool === "hitbox" ? (
        <Text style={styles.toolHint}>
          Orange handle = grid footprint · gold handle / drag outside crop = tap
          pad
        </Text>
      ) : null}
      {tool === "overlay" ? (
        <Text style={styles.toolHint}>
          Drag the pink screen box on the chassis · corner resizes · pick a
          channel state above to preview the animation
        </Text>
      ) : null}

      <View style={styles.mainRow}>
        <View
          style={styles.canvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onPointerDown}
          onResponderMove={onPointerMove}
          onResponderRelease={onPointerUp}
          onResponderTerminate={onPointerUp}
        >
          <View
            style={[
              styles.atlasLayer,
              {
                transform: [{ translateX: panX }, { translateY: panY }],
              },
            ]}
          >
            <Image
              source={atlasSource}
              style={[
                pixelatedImageStyle,
                {
                  width: atlasW * zoom,
                  height: atlasH * zoom,
                },
              ]}
              resizeMode="stretch"
            />
            {/* Dim outside crop */}
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: 0,
                  top: 0,
                  width: atlasW * zoom,
                  height: cropY * zoom,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: 0,
                  top: (cropY + cropH) * zoom,
                  width: atlasW * zoom,
                  height: Math.max(0, (atlasH - cropY - cropH) * zoom),
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: 0,
                  top: cropY * zoom,
                  width: cropX * zoom,
                  height: cropH * zoom,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: (cropX + cropW) * zoom,
                  top: cropY * zoom,
                  width: Math.max(0, (atlasW - cropX - cropW) * zoom),
                  height: cropH * zoom,
                },
              ]}
            />

            {/* Crop rect — only while Crop (or Pan overview) */}
            {showCropOverlay ? (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    styles.cropRect,
                    {
                      left: cropX * zoom,
                      top: cropY * zoom,
                      width: cropW * zoom,
                      height: cropH * zoom,
                    },
                  ]}
                />
                {tool === "crop" ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.cropHandle,
                      {
                        left: (cropX + cropW) * zoom - 5,
                        top: (cropY + cropH) * zoom - 5,
                      },
                    ]}
                  />
                ) : null}
              </>
            ) : null}

            {/* Hitbox: grid footprint + tap pad — only Hitbox / Pan */}
            {showHitOverlay ? (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    styles.hitPad,
                    {
                      left: padL * zoom,
                      top: padT * zoom,
                      width: (padR - padL) * zoom,
                      height: (padB - padT) * zoom,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.hitFootprint,
                    {
                      left: cropX * zoom,
                      top: cropY * zoom,
                      width: item.gridWidth * GRID_CELL * zoom,
                      height: item.gridHeight * GRID_CELL * zoom,
                    },
                  ]}
                />
                {tool === "hitbox" ? (
                  <>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.hitHandle,
                        {
                          left: footR * zoom - 5,
                          top: footB * zoom - 5,
                        },
                      ]}
                    />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.hitPadHandle,
                        {
                          left: padR * zoom - 5,
                          top: padB * zoom - 5,
                        },
                      ]}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {/* Sit seats — only Sit / Pan */}
            {showSitOverlay
              ? item.sittingPositions.map((sit, index) => (
                  <View
                    key={sit.id}
                    pointerEvents="none"
                    style={[
                      styles.sitMarker,
                      selectedSitId === sit.id && styles.sitMarkerActive,
                      {
                        left: (cropX + sit.x * GRID_CELL) * zoom,
                        top: (cropY + sit.y * GRID_CELL) * zoom,
                        width: SIT_SEAT_W_CELLS * GRID_CELL * zoom,
                        height: SIT_SEAT_H_CELLS * GRID_CELL * zoom,
                      },
                    ]}
                  >
                    <Text style={styles.sitIndex}>{index + 1}</Text>
                    <Text style={styles.sitArrow}>
                      {DIR_ARROW[sit.direction]}
                    </Text>
                  </View>
                ))
              : null}

            {/* Interact rects — only Interact / Pan */}
            {showInteractOverlay
              ? item.interactionHotspots.map((h) => (
                  <View
                    key={h.id}
                    pointerEvents="none"
                    style={[
                      styles.interactRect,
                      selectedInteractId === h.id && styles.interactRectActive,
                      {
                        left: (cropX + h.x * GRID_CELL) * zoom,
                        top: (cropY + h.y * GRID_CELL) * zoom,
                        width: h.width * GRID_CELL * zoom,
                        height: h.height * GRID_CELL * zoom,
                      },
                    ]}
                  />
                ))
              : null}
            {showInteractOverlay && draftInteract ? (
              <View
                pointerEvents="none"
                style={[
                  styles.interactRect,
                  styles.interactRectActive,
                  {
                    left: (cropX + draftInteract.x * GRID_CELL) * zoom,
                    top: (cropY + draftInteract.y * GRID_CELL) * zoom,
                    width: draftInteract.w * GRID_CELL * zoom,
                    height: draftInteract.h * GRID_CELL * zoom,
                  },
                ]}
              />
            ) : null}

            {/* Screen overlay placement — only Overlay / Pan */}
            {showOverlayLayer && overlayPlacement ? (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    styles.overlayRect,
                    {
                      left: (cropX + overlayPlacement.offsetX) * zoom,
                      top: (cropY + overlayPlacement.offsetY) * zoom,
                      width: overlayPlacement.width * zoom,
                      height: overlayPlacement.height * zoom,
                    },
                  ]}
                >
                  {animArt ? (
                    <OverlayArt
                      art={animArt}
                      width={overlayPlacement.width * zoom}
                      height={overlayPlacement.height * zoom}
                    />
                  ) : null}
                </View>
                {tool === "overlay" ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.overlayHandle,
                      {
                        left:
                          (cropX +
                            overlayPlacement.offsetX +
                            overlayPlacement.width) *
                            zoom -
                          5,
                        top:
                          (cropY +
                            overlayPlacement.offsetY +
                            overlayPlacement.height) *
                            zoom -
                          5,
                      },
                    ]}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.legend}>
            {legend.map((l) => (
              <View key={l.t} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: l.c }]} />
                <Text style={styles.legendText}>{l.t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sidePanel}>
          <Text style={styles.sideTitle}>Live cut</Text>
          <View
            style={[
              styles.previewFrame,
              {
                width: cropW * previewScale,
                height: cropH * previewScale,
              },
            ]}
          >
            <Image
              source={atlasSource}
              style={[
                pixelatedImageStyle,
                {
                  width: atlasW * previewScale,
                  height: atlasH * previewScale,
                  marginLeft: -cropX * previewScale,
                  marginTop: -cropY * previewScale,
                },
              ]}
              resizeMode="stretch"
            />
            {overlayPlacement && animArt ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: overlayPlacement.offsetX * previewScale,
                  top: overlayPlacement.offsetY * previewScale,
                  width: overlayPlacement.width * previewScale,
                  height: overlayPlacement.height * previewScale,
                  overflow: "hidden",
                }}
              >
                <OverlayArt
                  art={animArt}
                  width={overlayPlacement.width * previewScale}
                  height={overlayPlacement.height * previewScale}
                />
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            Crop {cropX},{cropY} · {cropW}×{cropH}px
          </Text>
          <Text style={styles.meta}>
            Grid {item.gridWidth}×{item.gridHeight} · pad {hitPad}px
          </Text>
          {overlayPlacement ? (
            <Text style={styles.meta}>
              Overlay {overlayPlacement.offsetX},{overlayPlacement.offsetY} ·{" "}
              {overlayPlacement.width}×{overlayPlacement.height}px
              {previewState ? ` · ${previewState.label}` : ""}
            </Text>
          ) : null}
          <Text style={styles.hint}>
            {tool === "pan" && "Drag to pan the atlas."}
            {tool === "crop" && "Drag crop · corner handle resizes."}
            {tool === "hitbox" && "Drag pad edge or footprint to resize."}
            {tool === "sit" &&
              `Tap empty to add a fixed ${SIT_SEAT_W_CELLS}×${SIT_SEAT_H_CELLS} seat · drag seats to place · couch = 2+ seats.`}
            {tool === "interact" && "Drag to create · drag boxes to move/resize."}
            {tool === "overlay" &&
              "Drag pink box to place the screen sequence on the chassis."}
          </Text>

          {tool === "sit" || item.sittingPositions.length > 0 ? (
            <View style={styles.inspector}>
              <Text style={styles.sideTitle}>
                Seats ({item.sittingPositions.length})
                {item.rotations && item.rotations.length > 0
                  ? ` · ${item.sprite}`
                  : ""}
              </Text>
              {item.rotations && item.rotations.length > 0 ? (
                <Text style={styles.toolHint}>
                  Sit facing is saved per rotation — switch ↓←→↑ above to edit
                  each
                </Text>
              ) : null}
              <Text style={styles.meta}>
                Fixed {SIT_SEAT_W_CELLS}×{SIT_SEAT_H_CELLS} cell each (character
                size) — not resizable. Add more for couches / benches.
              </Text>
              <Pressable style={styles.addSitBtn} onPress={addSitAtCropCenter}>
                <Text style={styles.addSitBtnText}>+ Add sit seat</Text>
              </Pressable>
              {item.sittingPositions.map((sit, index) => (
                <Pressable
                  key={sit.id}
                  style={[
                    styles.seatRow,
                    selectedSitId === sit.id && styles.seatRowActive,
                  ]}
                  onPress={() => {
                    setSelectedSitId(sit.id);
                    setTool("sit");
                  }}
                >
                  <Text style={styles.seatRowText}>
                    Seat {index + 1} · {DIR_ARROW[sit.direction]} · ({sit.x},{" "}
                    {sit.y})
                  </Text>
                </Pressable>
              ))}
              {selectedSit ? (
                <>
                  <Text style={styles.label}>Facing</Text>
                  <View style={styles.dirRow}>
                    {(["up", "down", "left", "right"] as const).map((d) => (
                      <Pressable
                        key={d}
                        style={[
                          styles.dirBtn,
                          selectedSit.direction === d && styles.dirBtnActive,
                        ]}
                        onPress={() =>
                          onChange({
                            sittingPositions: item.sittingPositions.map((p) =>
                              p.id === selectedSit.id
                                ? { ...p, direction: d }
                                : p,
                            ),
                          })
                        }
                      >
                        <Text style={styles.dirBtnText}>{DIR_ARROW[d]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => {
                      onChange({
                        sittingPositions: item.sittingPositions.filter(
                          (p) => p.id !== selectedSit.id,
                        ),
                      });
                      setSelectedSitId(null);
                    }}
                  >
                    <Text style={styles.removeBtnText}>Remove seat</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {selectedInteract ? (
            <View style={styles.inspector}>
              <Text style={styles.sideTitle}>Interact hotspot</Text>
              <Text style={styles.label}>Action</Text>
              <TextInput
                style={styles.input}
                value={selectedInteract.action}
                onChangeText={(action) =>
                  onChange({
                    interactionHotspots: item.interactionHotspots.map((h) =>
                      h.id === selectedInteract.id ? { ...h, action } : h,
                    ),
                  })
                }
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => {
                  onChange({
                    interactionHotspots: item.interactionHotspots.filter(
                      (h) => h.id !== selectedInteract.id,
                    ),
                  });
                  setSelectedInteractId(null);
                }}
              >
                <Text style={styles.removeBtnText}>Remove hotspot</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.saved}>Saved · live in rooms</Text>
        </View>
      </View>
    </View>
  );
}

/** Small cropped atlas thumb for list rows. */
export function AtlasCropThumb({
  item,
  size = 28,
  atlasSource = DEFAULT_ATLAS_SRC,
  atlasWidth = INTERIOR_ATLAS_W,
  atlasHeight = INTERIOR_ATLAS_H,
}: {
  item: Pick<
    FurnitureItemDefinition,
    "spriteX" | "spriteY" | "spriteWidth" | "spriteHeight"
  >;
  size?: number;
  atlasSource?: ImageSourcePropType;
  atlasWidth?: number;
  atlasHeight?: number;
}) {
  const cropX = item.spriteX ?? 0;
  const cropY = item.spriteY ?? 0;
  const cropW = Math.max(1, item.spriteWidth ?? 16);
  const cropH = Math.max(1, item.spriteHeight ?? 16);
  const scale = size / Math.max(cropW, cropH);
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      <Image
        source={atlasSource}
        style={[
          pixelatedImageStyle,
          {
            width: atlasWidth * scale,
            height: atlasHeight * scale,
            marginLeft: -cropX * scale,
            marginTop: -cropY * scale,
          },
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, gap: space.sm },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  toolHint: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 4,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  toolBtnActive: { backgroundColor: colors.accent },
  toolBtnText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  toolBtnTextActive: { color: colors.surfaceRaised },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8 },
  zoomLabel: { fontSize: 11, color: colors.inkMuted, fontWeight: "600" },
  mainRow: { flex: 1, flexDirection: "row", gap: space.sm, minHeight: 280 },
  canvas: {
    flex: 1,
    backgroundColor: "#1a1f1c",
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    overflow: "hidden",
    position: "relative",
  },
  atlasLayer: { position: "absolute", left: 0, top: 0 },
  dim: { position: "absolute", backgroundColor: "rgba(0,0,0,0.55)" },
  cropRect: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  cropHandle: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  hitFootprint: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#F59E0B",
    borderStyle: "dashed",
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  hitPad: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.85)",
    backgroundColor: "rgba(245,158,11,0.04)",
  },
  hitHandle: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#F59E0B",
    borderRadius: 2,
  },
  hitPadHandle: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#FBBF24",
    borderWidth: 1,
    borderColor: "#B45309",
    borderRadius: 2,
  },
  overlayRect: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#EC4899",
    backgroundColor: "rgba(236,72,153,0.15)",
    overflow: "hidden",
  },
  overlayHandle: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#EC4899",
    borderRadius: 2,
  },
  sitMarker: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  sitMarkerActive: {
    borderColor: "#fff",
    borderWidth: 3,
    backgroundColor: "rgba(34,197,94,0.55)",
  },
  sitIndex: {
    position: "absolute",
    top: 1,
    left: 3,
    color: "#fff",
    fontWeight: "800",
    fontSize: 9,
  },
  sitArrow: { color: "#fff", fontWeight: "800", fontSize: 14 },
  addSitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: "center",
  },
  addSitBtnText: {
    color: colors.surfaceRaised,
    fontWeight: "800",
    fontSize: 12,
  },
  seatRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  seatRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  seatRowText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  interactRect: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#A855F7",
    backgroundColor: "rgba(168,85,247,0.25)",
  },
  interactRectActive: { borderColor: "#fff" },
  legend: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 6,
    borderRadius: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  sidePanel: {
    width: 200,
    gap: 6,
    padding: space.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  sideTitle: {
    ...typography.brand,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  previewFrame: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: "#111",
    alignSelf: "flex-start",
  },
  meta: { fontSize: 11, color: colors.inkMuted },
  hint: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },
  inspector: { marginTop: 8, gap: 6 },
  dirRow: { flexDirection: "row", gap: 4 },
  dirBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dirBtnActive: { backgroundColor: colors.accent },
  dirBtnText: { fontWeight: "800", color: colors.ink },
  label: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  removeBtn: {
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
  },
  removeBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  saved: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: "700",
    color: colors.accent,
  },
  thumb: {
    overflow: "hidden",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#111",
  },
});
