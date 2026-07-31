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
 *
 * Cozy frames have empty padding above the head — shift so the face
 * (not just the hair tip) sits in the crop.
 */
export function CharacterFace({ appearance, size = 48 }: FaceProps) {
  // Zoom so head/shoulders fill the square; torso is clipped out.
  // Slightly under-zoomed (~8%) so the full face fits in the crop.
  const zoom = 2.0;
  const spriteSize = Math.round(size * zoom);
  // Face sits lower than the frame top because of transparent padding above the head.
  // Pull the sprite up so the face fills the crop (not the empty padding / hair tip).
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
  /** 1 for DM; up to 3 shown for parties (extras implied by +N). */
  appearances: Appearance[];
  size?: number;
};

/**
 * Hallway row avatar: single face for DMs, overlapped stack for parties.
 */
export function ConversationAvatar({
  appearances,
  size = 52,
}: ConversationAvatarProps) {
  const faces = appearances.slice(0, 3);
  const extra = Math.max(0, appearances.length - 3);

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

  // Overlapped stack — front face largest, others tucked behind/beside.
  const faceSize = Math.round(size * 0.78);
  const step = Math.round(size * 0.26);

  return (
    <View style={{ width: size, height: size }}>
      {faces.map((appearance, index) => {
        const fromBack = faces.length - 1 - index;
        const left = fromBack * step;
        const top = fromBack * Math.round(step * 0.3);
        return (
          <View
            key={index}
            style={[
              styles.stackSlot,
              {
                left,
                top,
                zIndex: index + 1,
              },
            ]}
          >
            <CharacterFace appearance={appearance} size={faceSize} />
          </View>
        );
      })}
      {extra > 0 ? (
        <View
          style={[
            styles.extraBadge,
            {
              width: Math.round(faceSize * 0.5),
              height: Math.round(faceSize * 0.5),
            },
          ]}
        >
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      ) : null}
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
  extraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    zIndex: 10,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.ink,
  },
});
