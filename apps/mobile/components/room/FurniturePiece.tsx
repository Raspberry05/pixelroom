import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AtlasSprite } from "../AtlasSprite";
import { OverlayArt } from "../OverlayArt";
import { PixelImage } from "../PixelImage";
import {
  drawnSize,
  FLOOR_DEPTH_CELLS,
  GRID_CELL,
  type PlacedFurniture,
  SPRITE_BY_ID,
} from "../../data/roomLayout";
import type { FurnitureCareIndicator } from "../../data/furnitureCare";
import {
  cropOverride,
  overrideOverlayPlacement,
  resolveVisualState,
} from "../../data/spriteOverrides";
import { DEFAULT_TV_OVERLAY } from "../../data/furnitureVisual";
import { resolveOverlayArt } from "../../data/overlayFrames";
import { colors } from "../../theme";

/** @deprecated Prefer FLOOR_DEPTH_CELLS * cellPx — kept for callers expecting a ratio. */
export const FLOOR_RATIO = 0.48;

type Props = {
  item: PlacedFurniture;
  stageHeight: number;
  cellPx: number;
  selected?: boolean;
  /** When dragging, optional live override in pixels. */
  dragOffset?: { x: number; y: number } | null;
  /** Called when user taps a packed furniture box (only in non-edit mode). */
  onTapPacked?: (item: PlacedFurniture) => void;
  /** Whether we're in editing mode (disables tap for unpacking). */
  editing?: boolean;
  /** Needs attention: dying plant / TV static / messy bed. */
  careIndicator?: FurnitureCareIndicator | null;
};

/**
 * Positions a placed sprite on the side-view stage using the shared world grid.
 */
export function FurniturePiece({
  item,
  stageHeight,
  cellPx,
  selected,
  dragOffset,
  onTapPacked,
  editing,
  careIndicator = null,
}: Props) {
  const meta = SPRITE_BY_ID[item.sprite];
  const isPacked = item.packed === true;

  const visualState = useMemo(
    () =>
      !meta || isPacked || careIndicator === "static"
        ? undefined
        : resolveVisualState(item.sprite, item.visualStateId),
    [meta, isPacked, careIndicator, item.sprite, item.visualStateId],
  );

  const frames = visualState?.kind === "sequence" ? visualState.frames ?? [] : [];
  const frameMs = visualState?.frameMs ?? 180;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [visualState?.id, frames.length]);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, frameMs);
    return () => clearInterval(id);
  }, [frames.length, frameMs, visualState?.id]);

  if (!meta) return null;

  const { w: drawnW, h: drawnH } = drawnSize(item.sprite, cellPx);
  const floorH = Math.min(FLOOR_DEPTH_CELLS * cellPx, stageHeight);
  const floorBaseline = Math.max(4, floorH * 0.14);
  const seamY = floorH;

  let left = item.gx * cellPx;
  let bottom: number;

  if (item.anchor === "wall") {
    bottom = seamY + item.gy * cellPx;
  } else {
    bottom = floorBaseline + item.gy * cellPx;
  }

  if (dragOffset) {
    left += dragOffset.x;
    bottom -= dragOffset.y;
  }

  const overlayPlacement =
    overrideOverlayPlacement(item.sprite) ??
    (item.sprite === "tv" ? DEFAULT_TV_OVERLAY : null);

  const scale = cellPx / GRID_CELL;
  const overlayFrame = frames[frameIndex] ?? frames[0];
  const overlayArt = overlayFrame ? resolveOverlayArt(overlayFrame) : null;

  const atlasCrop = !isPacked ? cropOverride(item.sprite) : null;

  const content = isPacked ? (
    <View style={styles.box}>
      <View style={styles.boxTop} />
      <View style={styles.boxLabel}>
        <View style={styles.boxLabelLine} />
        <View style={styles.boxLabelLine} />
      </View>
    </View>
  ) : (
    <View style={styles.spriteWrap}>
      {atlasCrop ? (
        <AtlasSprite crop={atlasCrop} width={drawnW} height={drawnH} />
      ) : (
        <PixelImage source={meta.source} width={drawnW} height={drawnH} />
      )}
      {overlayPlacement && visualState?.kind === "base" ? (
        <View
          pointerEvents="none"
          style={[
            styles.screenOverlay,
            styles.screenOff,
            {
              left: overlayPlacement.offsetX * scale,
              top: overlayPlacement.offsetY * scale,
              width: overlayPlacement.width * scale,
              height: overlayPlacement.height * scale,
            },
          ]}
        />
      ) : null}
      {overlayArt && overlayPlacement && visualState?.kind === "sequence" ? (
        <View
          pointerEvents="none"
          style={[
            styles.screenOverlay,
            {
              left: overlayPlacement.offsetX * scale,
              top: overlayPlacement.offsetY * scale,
              width: overlayPlacement.width * scale,
              height: overlayPlacement.height * scale,
            },
          ]}
        >
          <OverlayArt
            art={overlayArt}
            width={overlayPlacement.width * scale}
            height={overlayPlacement.height * scale}
          />
        </View>
      ) : null}
      {careIndicator === "dying" ? (
        <View style={[styles.careOverlay, styles.dyingOverlay]} pointerEvents="none">
          <Text style={styles.careBadge}>💧</Text>
          <View style={styles.wiltVeil} />
        </View>
      ) : null}
      {careIndicator === "static" ? (
        <View style={[styles.careOverlay, styles.staticOverlay]} pointerEvents="none">
          <Text style={styles.staticNoise}>░▒▓░</Text>
          <Text style={styles.careBadge}>📡</Text>
        </View>
      ) : null}
      {careIndicator === "messy" ? (
        <View style={[styles.careOverlay, styles.messyOverlay]} pointerEvents="none">
          <Text style={styles.messyLines}>≋≋</Text>
          <Text style={styles.careBadge}>🛏️</Text>
        </View>
      ) : null}
    </View>
  );

  const Wrapper = isPacked && !editing ? Pressable : View;

  return (
    <Wrapper
      style={[
        styles.piece,
        {
          left,
          bottom,
          width: drawnW,
          height: drawnH,
          zIndex: item.anchor === "wall" ? 4 : 10 + item.gy,
        },
        selected && styles.selected,
        isPacked && styles.packed,
      ]}
      onPress={isPacked && !editing ? () => onTapPacked?.(item) : undefined}
    >
      {content}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
  },
  spriteWrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  screenOverlay: {
    position: "absolute",
    overflow: "hidden",
  },
  screenOff: {
    backgroundColor: "#0a0a12",
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: "rgba(61, 107, 72, 0.12)",
  },
  packed: {
    cursor: "pointer",
  },
  box: {
    flex: 1,
    backgroundColor: "#C19A6B",
    borderWidth: 2,
    borderColor: "#8B6F47",
    borderRadius: 3,
    padding: 4,
    justifyContent: "space-between",
  },
  boxTop: {
    height: "30%",
    backgroundColor: "#A67C52",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#8B6F47",
  },
  boxLabel: {
    height: "25%",
    backgroundColor: "#FAEBD7",
    borderRadius: 2,
    padding: 2,
    justifyContent: "center",
    gap: 2,
  },
  boxLabelLine: {
    height: 2,
    backgroundColor: "#8B6F47",
    borderRadius: 1,
  },
  careOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  dyingOverlay: {
    backgroundColor: "rgba(120, 80, 40, 0.28)",
  },
  wiltVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(90, 60, 20, 0.18)",
  },
  staticOverlay: {
    backgroundColor: "rgba(20, 20, 28, 0.45)",
  },
  staticNoise: {
    position: "absolute",
    bottom: "28%",
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(220, 220, 230, 0.85)",
    letterSpacing: -1,
  },
  messyOverlay: {
    backgroundColor: "rgba(80, 60, 40, 0.2)",
  },
  messyLines: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(60, 40, 30, 0.7)",
    fontWeight: "700",
  },
  careBadge: {
    fontSize: 12,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
