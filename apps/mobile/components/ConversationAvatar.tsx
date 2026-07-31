import { StyleSheet, Text, View } from "react-native";
import type { Appearance } from "@pixelroom/core";
import { AvatarPreview } from "./AvatarSprite";
import { colors, radii } from "../theme";

type FaceProps = {
  appearance: Appearance;
  size?: number;
  /** Ring border (group stack uses thin rings). */
  bordered?: boolean;
};

/**
 * Circular crop zoomed onto the character's head/upper body.
 * Sprite frames include empty padding above the head — we scale up and clip.
 */
export function CharacterFace({
  appearance,
  size = 48,
  bordered = true,
}: FaceProps) {
  const spriteSize = Math.round(size * 2.05);
  const offsetY = -Math.round(size * 0.12);
  const offsetX = -Math.round((spriteSize - size) / 2);

  return (
    <View
      style={[
        styles.faceClip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: bordered ? 2 : 0,
        },
      ]}
    >
      <View style={{ marginTop: offsetY, marginLeft: offsetX }}>
        <AvatarPreview appearance={appearance} size={spriteSize} />
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
  size = 48,
}: ConversationAvatarProps) {
  const faces = appearances.slice(0, 3);
  const extra = Math.max(0, appearances.length - 3);

  if (faces.length === 0) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.fallbackText}>?</Text>
      </View>
    );
  }

  if (faces.length === 1) {
    return <CharacterFace appearance={faces[0]!} size={size} />;
  }

  // Overlapped stack — front face largest, others tucked behind/beside.
  const faceSize = Math.round(size * 0.72);
  const step = Math.round(size * 0.28);

  return (
    <View style={{ width: size, height: size }}>
      {faces.map((appearance, index) => {
        const fromBack = faces.length - 1 - index;
        const left = fromBack * step;
        const top = fromBack * Math.round(step * 0.35);
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
              width: Math.round(faceSize * 0.55),
              height: Math.round(faceSize * 0.55),
              borderRadius: radii.circle,
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
    backgroundColor: colors.accentSoft,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
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
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.ink,
  },
});
