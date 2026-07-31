import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { FLOOR_DEPTH, ROOM_SPAN_X, type Appearance, type RoomMemberState } from "@pixelroom/core";
import { colors } from "../../theme";
import { VIEW_BOOST, WORLD_SCALE } from "../../data/roomLayout";
import { AvatarSprite } from "../AvatarSprite";
import {
  stackBubbleOpacity,
  trimBubbleStack,
} from "../../lib/ephemeralBubble";
import { SpeechBubble } from "./SpeechBubble";

/** Horizontal walk speed in screen px/sec for duration scaling. */
const WALK_PX_PER_SEC = 78;

const BUBBLE_MAX = 3;
const BUBBLE_TICK_MS = 400;

type Bubble = {
  id: string;
  text: string;
  kind: "text" | "action" | "system";
  at: number;
};

type Props = {
  name: string;
  appearance: Appearance;
  member: RoomMemberState;
  isSelf: boolean;
  stageWidth: number;
  stageHeight: number;
  floorRatio: number;
  /** Logical X span of the full (possibly expanded) room. */
  worldSpanX?: number;
  /** Matches tile/cell display scale so avatars stay proportional. */
  displayScale?: number;
  /** Newest-first chat history above this character (ephemeral, slim stack). */
  bubbles?: Bubble[];
  /** Shift stack sideways when characters stand close. */
  bubbleNudgeX?: number;
  /** Messaging-style left/right column when conversing nearby. */
  bubbleAlign?: "left" | "right" | "center";
  /** When set, look toward this logical X (nearby conversation). */
  faceTowardX?: number | null;
};

/** Floating zzz particles rising from a sleeper. */
function SleepZzz() {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      t.setValue(0);
    };
  }, [t]);

  const particles: { glyph: string; delay: number; x: number; size: number }[] = [
    { glyph: "z", delay: 0, x: -6, size: 11 },
    { glyph: "z", delay: 0.22, x: 4, size: 13 },
    { glyph: "zz", delay: 0.45, x: -2, size: 12 },
    { glyph: "z", delay: 0.68, x: 8, size: 10 },
  ];

  return (
    <View style={styles.zzzWrap} pointerEvents="none">
      {particles.map((p, i) => {
        const phase = t.interpolate({
          inputRange: [0, p.delay, Math.min(1, p.delay + 0.55), 1],
          outputRange: [0, 0, 1, 1],
          extrapolate: "clamp",
        });
        const translateY = phase.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -28],
        });
        const translateX = phase.interpolate({
          inputRange: [0, 1],
          outputRange: [p.x, p.x + 10],
        });
        const opacity = phase.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, 0.95, 0.55, 0],
        });
        const scale = phase.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1.25],
        });
        return (
          <Animated.Text
            key={`${p.glyph}-${i}`}
            style={[
              styles.zzzGlyph,
              {
                fontSize: p.size,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          >
            {p.glyph}
          </Animated.Text>
        );
      })}
    </View>
  );
}

export function CharacterSprite({
  name,
  appearance,
  member,
  isSelf,
  stageWidth,
  stageHeight,
  floorRatio,
  worldSpanX = ROOM_SPAN_X,
  displayScale = 1,
  bubbles = [],
  bubbleNudgeX = 0,
  bubbleAlign = "center",
  faceTowardX = null,
}: Props) {
  const pixelScale = WORLD_SCALE * VIEW_BOOST * displayScale;
  const drawBase = 32 * pixelScale;
  const floorH = stageHeight * floorRatio;
  const span = Math.max(ROOM_SPAN_X, worldSpanX);
  const xRatio = Math.min(0.96, Math.max(0.04, member.position.x / span));
  const targetLeft = xRatio * stageWidth - drawBase / 2;

  const depthT = Math.min(1, Math.max(0, member.position.y / FLOOR_DEPTH));
  const sitting = member.currentAction === "sit";
  const sleeping = member.presence === "sleeping" || member.currentAction === "sleep";
  // Spread across most of the floor band — not glued to the bottom edge.
  const frontBottom = floorH * 0.14;
  const backBottom = Math.max(frontBottom + drawBase * 0.35, floorH * 0.9 - drawBase * 0.2);
  const targetBottom =
    frontBottom +
    depthT * (backBottom - frontBottom) +
    (sitting ? 6 * displayScale : 0) +
    (sleeping ? 4 * displayScale : 0);

  const conversingFacing =
    !sleeping &&
    faceTowardX != null &&
    Math.abs(faceTowardX - member.position.x) > 0.15
      ? faceTowardX < member.position.x
        ? ("left" as const)
        : ("right" as const)
      : null;
  const left = useRef(new Animated.Value(targetLeft)).current;
  const bottom = useRef(new Animated.Value(targetBottom)).current;
  const primed = useRef(false);
  const lastTarget = useRef({ left: targetLeft, bottom: targetBottom });
  const [moving, setMoving] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!primed.current) {
      left.setValue(targetLeft);
      bottom.setValue(targetBottom);
      lastTarget.current = { left: targetLeft, bottom: targetBottom };
      primed.current = true;
      return;
    }
    const dx = targetLeft - lastTarget.current.left;
    const dy = targetBottom - lastTarget.current.bottom;
    const dist = Math.hypot(dx, dy);
    lastTarget.current = { left: targetLeft, bottom: targetBottom };
    if (dist < 0.5) {
      left.setValue(targetLeft);
      bottom.setValue(targetBottom);
      return;
    }
    const duration = Math.round(
      Math.min(
        900,
        Math.max(220, (dist / WALK_PX_PER_SEC) * 1000),
      ),
    );
    left.stopAnimation();
    bottom.stopAnimation();
    setMoving(true);
    const anim = Animated.parallel([
      Animated.timing(left, {
        toValue: targetLeft,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }),
      Animated.timing(bottom, {
        toValue: targetBottom,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setMoving(false);
    });
    return () => {
      anim.stop();
    };
  }, [left, bottom, targetLeft, targetBottom]);

  useEffect(() => {
    if (bubbles.length === 0) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), BUBBLE_TICK_MS);
    return () => clearInterval(id);
  }, [bubbles.length, bubbles[0]?.id]);

  const drawSize = drawBase;
  const zIndex = 20 + Math.round(depthT * 12);
  // Lie flat: rotate toward facing so head points along the floor.
  const sleepRotate = member.facing === "left" ? "-90deg" : "90deg";
  const sleepAvatarStyle =
    Platform.OS === "web"
      ? ({
          opacity: 0.88,
          filter: "grayscale(0.6) brightness(0.9)",
        } as const)
      : styles.avatarSleepNative;

  // Play walk frames while lerping; don't keep moonwalking after arrival.
  const displayMember = useMemo((): RoomMemberState => {
    if (sleeping) return member;
    const facing = conversingFacing ?? member.facing;
    if (moving) {
      return { ...member, facing, currentAction: "walk" };
    }
    if (member.currentAction === "walk") {
      return { ...member, facing, currentAction: "idle" };
    }
    return conversingFacing ? { ...member, facing: conversingFacing } : member;
  }, [member, moving, sleeping, conversingFacing]);

  // Newest first → render oldest on top so stacks read upward.
  // Nearest chats stay solid; only the oldest is fading out.
  const visibleBubbles = sleeping
    ? []
    : trimBubbleStack(bubbles, now, BUBBLE_MAX);
  const stack = [...visibleBubbles].reverse();

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          left,
          bottom,
          width: drawBase,
          height: drawSize,
          zIndex,
        },
      ]}
    >
      <View
        style={[
          styles.overhead,
          bubbleAlign === "left" && styles.overheadLeft,
          bubbleAlign === "right" && styles.overheadRight,
          bubbleNudgeX !== 0 && { transform: [{ translateX: bubbleNudgeX }] },
        ]}
      >
        {stack.length > 0 ? (
          <View
            style={[
              styles.bubbleStack,
              bubbleAlign === "left" && styles.bubbleStackLeft,
              bubbleAlign === "right" && styles.bubbleStackRight,
            ]}
          >
            {stack.map((b, index) => {
              const fromNewest = stack.length - 1 - index;
              const isOldest = index === 0;
              const ageMs = Math.max(0, now - b.at);
              const opacity = stackBubbleOpacity(ageMs, b.text, {
                isOldest,
                stackCount: stack.length,
              });
              if (opacity < 0.03) return null;
              return (
                <View
                  key={b.id}
                  style={[
                    styles.bubbleSlot,
                    bubbleAlign === "left" && styles.bubbleSlotLeft,
                    bubbleAlign === "right" && styles.bubbleSlotRight,
                  ]}
                >
                  <SpeechBubble
                    text={b.text}
                    isSelf={isSelf}
                    kind={b.kind}
                    opacity={opacity}
                    showTail={fromNewest === 0}
                    compact={fromNewest > 0}
                    align={bubbleAlign}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Always centered on the sprite head — tucked into sprite top padding. */}
      <View
        style={[
          styles.headLabel,
          isSelf && styles.headLabelSelf,
          sleeping && styles.headLabelSleep,
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.nameText, sleeping && styles.nameTextSleep]}>{name}</Text>
        <Text style={[styles.actionText, sleeping && styles.actionTextSleep]}>
          {sleeping ? "offline" : member.currentAction}
        </Text>
      </View>

      <View
        style={[
          styles.body,
          sleeping && {
            transform: [{ rotate: sleepRotate }],
          },
        ]}
      >
        <View style={sleeping ? sleepAvatarStyle : undefined}>
          <AvatarSprite appearance={appearance} member={displayMember} size={drawSize} />
        </View>
      </View>
      {sleeping ? (
        <View
          style={[
            styles.zzzAnchor,
            member.facing === "left" ? styles.zzzAnchorLeft : styles.zzzAnchorRight,
          ]}
          pointerEvents="none"
        >
          <SleepZzz />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSleepNative: {
    opacity: 0.65,
  },
  zzzAnchor: {
    position: "absolute",
    top: -8,
    width: 40,
    height: 44,
  },
  zzzAnchorRight: {
    right: -18,
  },
  zzzAnchorLeft: {
    left: -18,
  },
  zzzWrap: {
    width: 36,
    height: 40,
  },
  zzzGlyph: {
    position: "absolute",
    left: 8,
    bottom: 0,
    color: colors.inkMuted,
    fontWeight: "800",
    fontStyle: "italic",
  },
  overhead: {
    position: "absolute",
    left: "50%",
    bottom: "100%",
    width: 160,
    marginLeft: -80,
    alignItems: "center",
    paddingBottom: 4,
    zIndex: 30,
  },
  overheadLeft: {
    alignItems: "flex-start",
    left: 0,
    marginLeft: -72,
    width: 156,
  },
  overheadRight: {
    alignItems: "flex-end",
    left: "auto",
    right: 0,
    marginLeft: 0,
    marginRight: -72,
    width: 156,
  },
  /** Name + state: centered on head, overlapped into sprite top padding. */
  headLabel: {
    alignItems: "center",
    justifyContent: "center",
    // Cozy/sheet frames have empty pixels above the head — pull tag down into them.
    marginBottom: -18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(244,247,244,0.94)",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    zIndex: 25,
  },
  headLabelSelf: {
    borderColor: colors.accent,
  },
  headLabelSleep: {
    backgroundColor: "rgba(220, 226, 228, 0.94)",
    borderColor: colors.pixelSleep,
  },
  bubbleStack: {
    width: "100%",
    alignItems: "center",
    marginBottom: 2,
    gap: 4,
  },
  bubbleStackLeft: {
    alignItems: "flex-start",
  },
  bubbleStackRight: {
    alignItems: "flex-end",
  },
  bubbleSlot: {
    width: "100%",
    alignItems: "center",
  },
  bubbleSlotLeft: {
    alignItems: "flex-start",
  },
  bubbleSlotRight: {
    alignItems: "flex-end",
  },
  nameText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  nameTextSleep: {
    color: colors.inkMuted,
  },
  actionText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  actionTextSleep: {
    color: colors.pixelSleep,
  },
});
