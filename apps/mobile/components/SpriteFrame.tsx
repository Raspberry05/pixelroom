import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
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

/** Sheets that have finished loading at least once — avoid re-hiding on walk frames. */
const readySheets = new Set<string>();

function sourceKey(source: ImageSourcePropType): string {
  if (typeof source === "number") return `asset:${source}`;
  if (typeof source === "string") return source;
  if (source && typeof source === "object" && "uri" in source && source.uri) {
    return `uri:${source.uri}`;
  }
  return `other:${String(source)}`;
}

/**
 * Crops one frame from a spritesheet and scales with nearest-neighbor (sharp pixels).
 * Sheet load is tracked per image source only — crop/walk-frame updates must not flash.
 */
export function SpriteFrame({
  source,
  sheetWidth,
  sheetHeight,
  rect,
  scale,
}: Props) {
  const key = useMemo(() => sourceKey(source), [source]);
  const [sheetReady, setSheetReady] = useState(() => readySheets.has(key));
  const viewW = Math.max(1, Math.round(rect.w * scale));
  const viewH = Math.max(1, Math.round(rect.h * scale));
  const imgW = Math.round(sheetWidth * scale);
  const imgH = Math.round(sheetHeight * scale);

  useEffect(() => {
    if (readySheets.has(key)) {
      setSheetReady(true);
      return;
    }
    setSheetReady(false);
    // Cached images may skip onLoad on web.
    const fallback = setTimeout(() => {
      readySheets.add(key);
      setSheetReady(true);
    }, 160);
    return () => clearTimeout(fallback);
  }, [key]);

  function markReady() {
    readySheets.add(key);
    setSheetReady(true);
  }

  return (
    <View style={[styles.clip, { width: viewW, height: viewH }]}>
      <Image
        source={source}
        onLoad={markReady}
        onLoadEnd={markReady}
        style={[
          styles.sheet,
          pixelatedImageStyle,
          {
            width: imgW,
            height: imgH,
            left: -Math.round(rect.x * scale),
            top: -Math.round(rect.y * scale),
            opacity: sheetReady ? 1 : 0,
          },
          Platform.OS === "web"
            ? ({
                imageRendering: "pixelated",
                msInterpolationMode: "nearest-neighbor",
              } as object)
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
