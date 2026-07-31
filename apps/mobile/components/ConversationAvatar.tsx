import { StyleSheet, Text, View } from "react-native";
import type { Appearance } from "@pixelroom/core";
import { AvatarPreview } from "./AvatarSprite";
import { colors, radii } from "../theme";

type FaceProps = {
  appearance: Appearance;
  size?: number;
};

/**
 * Snapchat-style PFP: square, no background, head + shoulders only
 * (full sprite zoomed and clipped at the torso).
 */
export function CharacterFace({ appearance, size = 48 }: FaceProps) {
  const zoom = 2.0;
  const spriteSize = Math.round(size * zoom);
  const headCenterRatio = 0.5;
  const offsetY = Math.round(size * 0.42 - spriteSize * headCenterRatio);
  const offsetX = -Math.round((spriteSize - size) / 2);

  return (
    <View
      style={[
        styles.faceClip,
        {
          width: size,
          height: size,
        },
      ]}
      accessibilityRole="image"
    >
      <View
        style={{
          width: spriteSize,
          height: spriteSize,
          transform: [{ translateY: offsetY }, { translateX: offsetX }],
        }}
      >
        <AvatarPreview appearance={appearance} size={spriteSize} exactSize />
      </View>
    </View>
  );
}

type ConversationAvatarProps = {
  /** Peers only — caller should exclude self. */
  appearances: Appearance[];
  size?: number;
};

/**
 * Hallway row avatar:
 * - DM: single peer face
 * - Party: up to 3 peers in a `<` / zigzag stack (never self)
 *
 *   ....char3  (back, mid X, faded)
 * char2        (mid z, left, faded)
 * .......char1 (front, right, solid)
 */
export function ConversationAvatar({
  appearances,
  size = 56,
}: ConversationAvatarProps) {
  const faces = appearances.slice(0, 3);

  if (faces.length === 0) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Text style={styles.fallbackText}>?</Text>
      </View>
    );
  }

  if (faces.length === 1) {
    return <CharacterFace appearance={faces[0]!} size={size} />;
  }

  const frontSize = Math.round(size * 0.72);
  const midSize = Math.round(size * 0.68);
  const backSize = Math.round(size * 0.64);

  // char1 front-right (solid), char2 left, char3 mid-X between the two (farther back).
  const char1Left = size - frontSize;
  const char1Top = Math.round(size - frontSize - size * 0.02);
  const char2Left = 0;
  const char2Top = Math.round((size - midSize) * 0.45);
  // Center between the two front faces' centers, then nudge right so it reads as middle.
  const char2Center = char2Left + midSize / 2;
  const char1Center = char1Left + frontSize / 2;
  const char3Left = Math.max(
    0,
    Math.min(
      size - backSize,
      Math.round((char2Center + char1Center) / 2 - backSize / 2 + size * 0.16),
    ),
  );
  const char3Top = Math.round(size * 0.06);

  if (faces.length === 2) {
    return (
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.stackSlot,
            {
              left: char2Left,
              top: char2Top,
              zIndex: 1,
            },
          ]}
        >
          <TintedFace appearance={faces[1]!} size={midSize} strength="soft" />
        </View>
        <View
          style={[
            styles.stackSlot,
            {
              left: char1Left,
              top: char1Top,
              zIndex: 2,
            },
          ]}
        >
          <CharacterFace appearance={faces[0]!} size={frontSize} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {/* char3 — farthest back, X between char2 and char1 */}
      <View
        style={[
          styles.stackSlot,
          {
            left: char3Left,
            top: char3Top,
            zIndex: 1,
          },
        ]}
      >
        <TintedFace appearance={faces[2]!} size={backSize} strength="strong" />
      </View>
      {/* char2 — left, mid depth */}
      <View
        style={[
          styles.stackSlot,
          {
            left: char2Left,
            top: char2Top,
            zIndex: 2,
          },
        ]}
      >
        <TintedFace appearance={faces[1]!} size={midSize} strength="soft" />
      </View>
      {/* char1 — front right, fully opaque */}
      <View
        style={[
          styles.stackSlot,
          {
            left: char1Left,
            top: char1Top,
            zIndex: 3,
          },
        ]}
      >
        <CharacterFace appearance={faces[0]!} size={frontSize} />
      </View>
    </View>
  );
}

/** Recessed peers: filter tints sprite pixels only (transparent stays clear — no box). */
function TintedFace({
  appearance,
  size,
  strength,
}: {
  appearance: Appearance;
  size: number;
  strength: "soft" | "strong";
}) {
  return (
    <View
      style={[
        { width: size, height: size },
        strength === "strong" ? styles.tintStrong : styles.tintSoft,
      ]}
    >
      <CharacterFace appearance={appearance} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  faceClip: {
    overflow: "hidden",
    backgroundColor: "transparent",
    borderRadius: 0,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  stackSlot: {
    position: "absolute",
  },
  tintSoft: {
    // Web: dims only drawn pixels; alpha channel stays intact.
    // @ts-expect-error RN web filter
    filter: "brightness(0.92) saturate(0.7) contrast(0.96)",
  },
  tintStrong: {
    // @ts-expect-error RN web filter
    filter: "brightness(0.86) saturate(0.55) contrast(0.94)",
  },
});
