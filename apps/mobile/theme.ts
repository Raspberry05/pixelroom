export const colors = {
  bg: "#e4ebe4",
  bgDeep: "#d5dfd5",
  surface: "#f4f7f4",
  surfaceRaised: "#ffffff",
  ink: "#1a221c",
  inkMuted: "#5c6b60",
  inkFaint: "#8a9a8e",
  accent: "#2f6f55",
  accentSoft: "#d8ebe1",
  accentHot: "#3d8f6c",
  border: "#b7c4b8",
  borderStrong: "#1a221c",
  danger: "#a33b3b",
  pixelAlice: "#5b8def",
  pixelBob: "#e07a5f",
  pixelSleep: "#7a8690",
  floorA: "#9aaf8e",
  floorB: "#8da282",
  wallTop: "#dfe8d9",
  wallBottom: "#c5d4c0",
  wallTrim: "#6d7f68",
  furniture: "#6b5344",
  furnitureLight: "#8a6d5b",
  bed: "#6a7f9a",
  couch: "#4a6741",
  /** Peer chat bubbles — always grey. */
  bubble: "#e4e7e5",
  /** Your chat bubbles — always green. */
  bubbleSelf: "#dff0e7",
  /** Action / emote bubbles — blue (either speaker). */
  bubbleAction: "#d6e4f5",
  action: "#3a6ea8",
  actionSoft: "#d6e4f5",
  overlay: "rgba(26, 34, 28, 0.45)",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  brand: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  title: {
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.4,
  },
  mono: {
    fontSize: 12,
    fontWeight: "600" as const,
    fontVariant: ["tabular-nums"] as const,
  },
};

export const radii = {
  none: 0,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  circle: 999,
} as const;

/** Logical room width used to map simulation X → side-view screen X.
 *  Prefer ROOM_SPAN_X from @pixelroom/core for new code.
 */
export const ROOM_SPAN = 12;
