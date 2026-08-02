import type { ReactNode } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import {
  hasAtlasCrop,
  resolveAtlasPack,
  type AtlasCropFields,
} from "../data/atlasCrop";
import { pixelatedImageStyle } from "./PixelImage";

type Props = {
  crop: AtlasCropFields;
  width: number;
  height: number;
};

/**
 * Draw an atlas/sheet crop stretched to width×height (same math as DevTools thumbs).
 */
export function AtlasSprite({ crop, width, height }: Props) {
  const pack = resolveAtlasPack(crop.atlasKey);
  const cropX = crop.spriteX ?? 0;
  const cropY = crop.spriteY ?? 0;
  const cropW = Math.max(1, crop.spriteWidth ?? 16);
  const cropH = Math.max(1, crop.spriteHeight ?? 16);
  const scaleX = width / cropW;
  const scaleY = height / cropH;

  return (
    <View style={[styles.clip, { width, height }]}>
      <Image
        source={pack.source}
        style={[
          pixelatedImageStyle,
          {
            width: pack.width * scaleX,
            height: pack.height * scaleY,
            marginLeft: -cropX * scaleX,
            marginTop: -cropY * scaleY,
          },
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}

/** Prefer DevTools crop; otherwise fall back to a full image source. */
export function CatalogArt({
  crop,
  fallbackSource,
  width,
  height,
  fallback,
}: {
  crop?: AtlasCropFields | null;
  fallbackSource?: ImageSourcePropType | null;
  width: number;
  height: number;
  fallback?: ReactNode;
}) {
  if (hasAtlasCrop(crop)) {
    return <AtlasSprite crop={crop!} width={width} height={height} />;
  }
  if (fallbackSource) {
    return (
      <Image
        source={fallbackSource}
        style={[
          pixelatedImageStyle,
          { width, height },
        ]}
        resizeMode="stretch"
      />
    );
  }
  return <>{fallback ?? null}</>;
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
