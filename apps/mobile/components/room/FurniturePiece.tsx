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
}: Props) {
  const meta = SPRITE_BY_ID[item.sprite];
  if (!meta) return null;

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

  return (
    <View
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
      ]}
    >
      <PixelImage source={meta.source} width={drawnW} height={drawnH} />
    </View>
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
});
