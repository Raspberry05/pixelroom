import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";

type Props = {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
};

type Channel = {
  id: number;
  name: string;
  emoji: string;
  frequency: number; // The channel number to find
};

const CHANNELS: Channel[] = [
  { id: 1, name: "Comedy Central", emoji: "😂", frequency: 42 },
  { id: 2, name: "Nature Zone", emoji: "🌿", frequency: 15 },
  { id: 3, name: "Sports Network", emoji: "⚽", frequency: 88 },
  { id: 4, name: "Cooking Show", emoji: "🍳", frequency: 27 },
  { id: 5, name: "Space Channel", emoji: "🚀", frequency: 99 },
];

export function TVWatchingMiniGame({ visible, onComplete, onCancel }: Props) {
  const [targetChannel, setTargetChannel] = useState<Channel | null>(null);
  const [currentFrequency, setCurrentFrequency] = useState(1);
  const [foundChannels, setFoundChannels] = useState<number[]>([]);
  const [staticAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Pick a random channel to find
      const randomChannel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
      setTargetChannel(randomChannel ?? null);
      setCurrentFrequency(1);
      setFoundChannels([]);
    }
  }, [visible]);

  // Static animation when between channels
  useEffect(() => {
    if (!visible) return;
    
    const isOnChannel = CHANNELS.some((ch) => ch.frequency === currentFrequency);
    
    if (!isOnChannel) {
      // Animate static
      Animated.loop(
        Animated.sequence([
          Animated.timing(staticAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(staticAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      staticAnim.setValue(0);
    }
  }, [currentFrequency, visible]);

  const handleChannelUp = () => {
    setCurrentFrequency((prev) => Math.min(prev + 1, 100));
  };

  const handleChannelDown = () => {
    setCurrentFrequency((prev) => Math.max(prev - 1, 1));
  };

  const handleNumberPress = (digit: number) => {
    const newFreq = parseInt(String(currentFrequency) + String(digit));
    if (newFreq <= 100) {
      setCurrentFrequency(newFreq);
    }
  };

  const handleConfirm = () => {
    if (!targetChannel) return;
    
    if (currentFrequency === targetChannel.frequency) {
      if (!foundChannels.includes(targetChannel.id)) {
        setFoundChannels((prev) => [...prev, targetChannel.id]);
        
        // Success animation
        Animated.sequence([
          Animated.timing(successAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(successAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Complete after short delay
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    }
  };

  const currentChannel = CHANNELS.find((ch) => ch.frequency === currentFrequency);
  const isStatic = !currentChannel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>📺 Watch TV</Text>
            {targetChannel && (
              <Text style={styles.subtitle}>
                Find channel {targetChannel.frequency}: {targetChannel.name} {targetChannel.emoji}
              </Text>
            )}
          </View>

          {/* TV Screen */}
          <View style={styles.tvScreen}>
            <Animated.View
              style={[
                styles.screenContent,
                {
                  opacity: isStatic ? staticAnim : 1,
                },
              ]}
            >
              {isStatic ? (
                <View style={styles.static}>
                  <Text style={styles.staticText}>❄️</Text>
                  <Text style={styles.staticLabel}>STATIC</Text>
                </View>
              ) : (
                <Animated.View
                  style={[
                    styles.channel,
                    {
                      transform: [{ scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      })}],
                    },
                  ]}
                >
                  <Text style={styles.channelEmoji}>{currentChannel?.emoji}</Text>
                  <Text style={styles.channelName}>{currentChannel?.name}</Text>
                  <Text style={styles.channelFreq}>CH {currentFrequency}</Text>
                </Animated.View>
              )}
            </Animated.View>
            
            {/* Frequency Display */}
            <View style={styles.frequencyDisplay}>
              <Text style={styles.frequencyText}>{currentFrequency.toString().padStart(2, '0')}</Text>
            </View>
          </View>

          {/* Remote Control */}
          <View style={styles.remote}>
            <Text style={styles.remoteTitle}>Remote Control</Text>
            
            <View style={styles.remoteButtons}>
              {/* Navigation Buttons */}
              <View style={styles.navButtons}>
                <Pressable style={styles.navBtn} onPress={handleChannelUp}>
                  <Text style={styles.navBtnText}>CH ▲</Text>
                </Pressable>
                <Pressable style={styles.navBtn} onPress={handleChannelDown}>
                  <Text style={styles.navBtnText}>CH ▼</Text>
                </Pressable>
              </View>
              
              {/* Number Pad */}
              <View style={styles.numberPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <Pressable
                    key={num}
                    style={styles.numberBtn}
                    onPress={() => handleNumberPress(num)}
                  >
                    <Text style={styles.numberBtnText}>{num}</Text>
                  </Pressable>
                ))}
              </View>
              
              {/* Confirm Button */}
              <Pressable
                style={[
                  styles.confirmBtn,
                  currentFrequency === targetChannel?.frequency && styles.confirmBtnActive,
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmBtnText}>✓ Confirm</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg,
  },
  container: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    padding: space.lg,
    gap: space.md,
  },
  header: {
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    ...typography.brand,
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
  },
  tvScreen: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
    borderRadius: radii.lg,
    borderWidth: 4,
    borderColor: "#333333",
    position: "relative",
    overflow: "hidden",
  },
  screenContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  static: {
    alignItems: "center",
    gap: space.sm,
  },
  staticText: {
    fontSize: 80,
    opacity: 0.5,
  },
  staticLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666666",
    letterSpacing: 4,
  },
  channel: {
    alignItems: "center",
    gap: space.sm,
  },
  channelEmoji: {
    fontSize: 80,
  },
  channelName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  channelFreq: {
    fontSize: 14,
    color: "#AAAAAA",
  },
  frequencyDisplay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  frequencyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00FF00",
    fontVariant: ["tabular-nums"],
  },
  remote: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    padding: space.md,
    gap: space.md,
  },
  remoteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  remoteButtons: {
    gap: space.md,
  },
  navButtons: {
    flexDirection: "row",
    gap: space.sm,
  },
  navBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  numberPad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  numberBtn: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  numberBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },
  confirmBtn: {
    backgroundColor: colors.bgDeep,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: "center",
  },
  confirmBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
});
