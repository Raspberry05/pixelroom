import { Image, Platform, StyleSheet, type ImageSourcePropType, type ImageStyle, type StyleProp } from "react-native";

/** Nearest-neighbor scaling so pixel art stays sharp (not blurry) when upscaled. */
export const pixelatedImageStyle: ImageStyle =
  Platform.OS === "web"
    ? ({
        imageRendering: "pixelated",
      } as ImageStyle)
    : {};

type Props = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  style?: StyleProp<ImageStyle>;
};

export function PixelImage({ source, width, height, style }: Props) {
  return (
    <Image
      source={source}
      style={[styles.base, pixelatedImageStyle, { width, height }, style]}
      resizeMode="stretch"
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});
