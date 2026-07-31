import { Pressable, StyleSheet, View } from "react-native";
import { PixelImage } from "../PixelImage";
import {
  CELL_PX,
  drawnSize,
  type PlacedFurniture,
  SPRITE_BY_ID,
} from "../../data/roomLayout";
import { colors } from "../../theme";

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
}: Props) {
  const meta = SPRITE_BY_ID[item.sprite];
  if (!meta) return null;

  const isPacked = item.packed === true;
  const { w: drawnW, h: drawnH } = drawnSize(item.sprite, cellPx);
  const floorH = stageHeight * FLOOR_RATIO;
  // Match character front depth so furniture lives in the visible floor band.
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

  const content = isPacked ? (
    <View style={styles.box}>
      <View style={styles.boxTop} />
      <View style={styles.boxLabel}>
        <View style={styles.boxLabelLine} />
        <View style={styles.boxLabelLine} />
      </View>
    </View>
  ) : (
    <PixelImage source={meta.source} width={drawnW} height={drawnH} />
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
});
