import { Image, View, type ImageSourcePropType } from "react-native";
import { pixelatedImageStyle } from "./PixelImage";
import type { ResolvedOverlayArt } from "../data/overlayFrames";

type Props = {
  art: ResolvedOverlayArt;
  width: number;
  height: number;
};

/** Draw either a clipped atlas crop or a piece sprite into a fixed box. */
export function OverlayArt({ art, width, height }: Props) {
  if (art.kind === "sprite") {
    return (
      <Image
        source={art.source}
        style={[pixelatedImageStyle, { width, height }]}
        resizeMode="stretch"
      />
    );
  }

  const scaleX = width / art.w;
  const scaleY = height / art.h;

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Image
        source={art.source as ImageSourcePropType}
        style={[
          pixelatedImageStyle,
          {
            width: art.atlasW * scaleX,
            height: art.atlasH * scaleY,
            marginLeft: -art.x * scaleX,
            marginTop: -art.y * scaleY,
          },
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}
