import { Pressable, StyleSheet, Text, View } from "react-native";
import { SpriteFrame } from "./SpriteFrame";
import { COZY_SHEET } from "../data/sprites";
import { colors, radii } from "../theme";

type Props = {
  /** Cozy sheet layer row, or null for empty slot art. */
  layerRow?: number | null;
  size?: number;
};

/** Pixel thumb of one cozy clothing layer (idle, facing right). */
export function ClothLayerThumb({ layerRow, size = 56 }: Props) {
  const scale = Math.max(1, Math.round(size / COZY_SHEET.frame));
  const px = COZY_SHEET.frame * scale;

  if (layerRow == null) {
    return (
      <View style={[styles.empty, { width: px, height: px }]}>
        <Text style={styles.emptyMark}>—</Text>
      </View>
    );
  }

  return (
    <View style={[styles.clip, { width: px, height: px }]}>
      <SpriteFrame
        source={COZY_SHEET.source}
        sheetWidth={COZY_SHEET.width}
        sheetHeight={COZY_SHEET.height}
        rect={{
          x: 0,
          y: layerRow * COZY_SHEET.frame,
          w: COZY_SHEET.frame,
          h: COZY_SHEET.frame,
        }}
        scale={scale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    borderRadius: radii.sm,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyMark: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkFaint,
  },
});
