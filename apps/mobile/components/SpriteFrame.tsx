import { Image, Platform, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { pixelatedImageStyle } from "./PixelImage";

export type SheetRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  source: ImageSourcePropType;
  sheetWidth: number;
  sheetHeight: number;
  rect: SheetRect;
  scale: number;
};

/**
 * Crops one frame from a spritesheet and scales with nearest-neighbor (sharp pixels).
 */
export function SpriteFrame({
  source,
  sheetWidth,
  sheetHeight,
  rect,
  scale,
}: Props) {
  const viewW = Math.max(1, Math.round(rect.w * scale));
  const viewH = Math.max(1, Math.round(rect.h * scale));
  const imgW = Math.round(sheetWidth * scale);
  const imgH = Math.round(sheetHeight * scale);

  return (
    <View style={[styles.clip, { width: viewW, height: viewH }]}>
      <Image
        source={source}
        style={[
          styles.sheet,
          pixelatedImageStyle,
          {
            width: imgW,
            height: imgH,
            left: -Math.round(rect.x * scale),
            top: -Math.round(rect.y * scale),
          },
          Platform.OS === "web"
            ? ({ imageRendering: "pixelated", msInterpolationMode: "nearest-neighbor" } as object)
            : null,
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  sheet: {
    position: "absolute",
  },
});
