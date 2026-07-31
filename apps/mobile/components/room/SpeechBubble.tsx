import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme";

export type BubbleAlign = "left" | "right" | "center";

type Props = {
  text: string;
  isSelf?: boolean;
  kind?: "text" | "action" | "system";
  /** 0–1 visual weight (older history bubbles fade). */
  opacity?: number;
  /** Only the newest bubble in a stack keeps the speech tail. */
  showTail?: boolean;
  /** Compact spacing for stacked history. */
  compact?: boolean;
  /** Messaging-style side when two speakers stand near each other. */
  align?: BubbleAlign;
};

const BUBBLE_MAX_W = 148;

export function SpeechBubble({
  text,
  isSelf,
  kind = "text",
  opacity = 1,
  showTail = true,
  compact = false,
  align = "center",
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    // First paint: pop in. Later: ease toward ephemeral opacity (incl. fade-out to 0).
    if (!mounted.current) {
      mounted.current = true;
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: opacity,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(fade, {
      toValue: opacity,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fade, opacity]);

  const side = align === "center" ? (isSelf ? "right" : "left") : align;
  const isAction = kind === "action";
  const isYou = Boolean(isSelf) && !isAction;

  return (
    <Animated.View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        side === "left" && styles.wrapLeft,
        side === "right" && styles.wrapRight,
        { opacity: fade },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isYou && styles.bubbleSelf,
          isAction && styles.bubbleAction,
          compact && styles.bubbleCompact,
          side === "left" && styles.bubbleLeft,
          side === "right" && styles.bubbleRight,
        ]}
      >
        <Text
          style={[
            styles.text,
            side === "left" && styles.textLeft,
            side === "right" && styles.textRight,
            isAction && styles.textAction,
            compact && styles.textCompact,
          ]}
        >
          {text}
        </Text>
      </View>
      {showTail ? (
        <View
          style={[
            styles.tailRow,
            side === "left" && styles.tailRowLeft,
            side === "right" && styles.tailRowRight,
          ]}
        >
          <View
            style={[
              styles.tailBorder,
              isYou && styles.tailBorderSelf,
              isAction && styles.tailBorderAction,
            ]}
          />
          <View
            style={[
              styles.tailFill,
              isYou && styles.tailFillSelf,
              isAction && styles.tailFillAction,
            ]}
          />
        </View>
      ) : (
        <View style={styles.tailSpacer} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: BUBBLE_MAX_W,
    width: "100%",
    alignItems: "center",
  },
  wrapCompact: {
    maxWidth: BUBBLE_MAX_W - 8,
  },
  wrapLeft: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
  },
  wrapRight: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
  },
  bubble: {
    maxWidth: BUBBLE_MAX_W,
    backgroundColor: colors.bubble,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  bubbleCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleSelf: {
    backgroundColor: colors.bubbleSelf,
    borderColor: colors.accent,
  },
  bubbleAction: {
    backgroundColor: colors.bubbleAction,
    borderColor: colors.action,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "left",
    flexShrink: 1,
  },
  textLeft: {
    textAlign: "left",
  },
  textRight: {
    textAlign: "left",
  },
  textCompact: {
    fontSize: 12,
  },
  textAction: {
    fontStyle: "italic",
    color: colors.action,
  },
  tailRow: {
    width: 14,
    height: 10,
    alignItems: "center",
    marginTop: -2,
    alignSelf: "center",
  },
  tailRowLeft: {
    alignSelf: "flex-start",
    marginLeft: 12,
  },
  tailRowRight: {
    alignSelf: "flex-end",
    marginRight: 12,
  },
  tailSpacer: {
    height: 4,
  },
  tailBorder: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.borderStrong,
  },
  tailBorderSelf: {
    borderTopColor: colors.accent,
  },
  tailBorderAction: {
    borderTopColor: colors.action,
  },
  tailFill: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.bubble,
  },
  tailFillSelf: {
    borderTopColor: colors.bubbleSelf,
  },
  tailFillAction: {
    borderTopColor: colors.bubbleAction,
  },
});
