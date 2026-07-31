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

type PillowPattern = "square" | "round" | "heart" | "star";

type BedStep = {
  name: string;
  icon: string;
  pattern?: PillowPattern[];
};

const PILLOW_ICONS: Record<PillowPattern, string> = {
  square: "🟦",
  round: "🔵",
  heart: "💙",
  star: "⭐",
};

const BED_STEPS: BedStep[] = [
  { name: "Unfold Sheet", icon: "📄" },
  { name: "Arrange Pillows", icon: "🛏️", pattern: ["square", "round", "square"] },
  { name: "Add Blanket", icon: "🧺" },
  { name: "Fluff Pillows", icon: "💨", pattern: ["heart", "star", "heart", "star"] },
];

export function BedMakingMiniGame({ visible, onComplete, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState<PillowPattern[]>([]);
  const [progressAnim] = useState(new Animated.Value(0));
  const [shakeAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setSelectedPattern([]);
      progressAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: currentStep / BED_STEPS.length,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [currentStep]);

  const currentStepData = BED_STEPS[currentStep];
  const needsPattern = currentStepData?.pattern && currentStepData.pattern.length > 0;

  const handleSimpleStep = () => {
    if (currentStep >= BED_STEPS.length - 1) {
      // Success animation
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    } else {
      setCurrentStep((prev) => prev + 1);
      setSelectedPattern([]);
    }
  };

  const handlePatternSelect = (pillow: PillowPattern) => {
    if (!currentStepData) return;
    
    const newPattern = [...selectedPattern, pillow];
    setSelectedPattern(newPattern);

    // Check if pattern is complete
    if (currentStepData.pattern && newPattern.length === currentStepData.pattern.length) {
      // Validate pattern
      const isCorrect = newPattern.every(
        (p, i) => p === currentStepData.pattern![i],
      );

      if (isCorrect) {
        // Correct! Move to next step
        setTimeout(() => {
          if (currentStep >= BED_STEPS.length - 1) {
            // Success animation
            Animated.sequence([
              Animated.timing(successAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(successAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onComplete();
            });
          } else {
            setCurrentStep((prev) => prev + 1);
            setSelectedPattern([]);
          }
        }, 400);
      } else {
        // Wrong pattern - shake and reset
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setSelectedPattern([]);
        });
      }
    }
  };

  const handleClearPattern = () => {
    setSelectedPattern([]);
  };

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
            <Text style={styles.title}>🛏️ Make the Bed</Text>
            <Text style={styles.subtitle}>
              Complete each step carefully
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Current Step Display */}
          <Animated.View
            style={[
              styles.stepDisplay,
              {
                transform: [
                  { translateX: shakeAnim },
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.stepIcon}>{currentStepData?.icon}</Text>
            <Text style={styles.stepName}>{currentStepData?.name}</Text>
            <Text style={styles.stepNumber}>
              Step {currentStep + 1} of {BED_STEPS.length}
            </Text>
          </Animated.View>

          {/* Pattern Matching Interface */}
          {needsPattern ? (
            <View style={styles.patternSection}>
              <Text style={styles.patternTitle}>Match the pattern:</Text>
              
              {/* Target Pattern */}
              <View style={styles.targetPattern}>
                {currentStepData.pattern!.map((pillow, i) => (
                  <View key={i} style={styles.patternSlot}>
                    <Text style={styles.patternIcon}>{PILLOW_ICONS[pillow]}</Text>
                  </View>
                ))}
              </View>

              {/* Selected Pattern */}
              <View style={styles.selectedPattern}>
                {Array.from({ length: currentStepData.pattern!.length }).map((_, i) => (
                  <View key={i} style={styles.patternSlot}>
                    <Text style={styles.patternIcon}>
                      {selectedPattern[i] ? PILLOW_ICONS[selectedPattern[i]] : "❔"}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Pillow Selection */}
              <View style={styles.pillowSelection}>
                {(Object.keys(PILLOW_ICONS) as PillowPattern[]).map((pillow) => (
                  <Pressable
                    key={pillow}
                    style={styles.pillowBtn}
                    onPress={() => handlePatternSelect(pillow)}
                    disabled={selectedPattern.length >= currentStepData.pattern!.length}
                  >
                    <Text style={styles.pillowBtnIcon}>{PILLOW_ICONS[pillow]}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.clearBtn} onPress={handleClearPattern}>
                <Text style={styles.clearBtnText}>↺ Clear</Text>
              </Pressable>
            </View>
          ) : (
            /* Simple Step Button */
            <Pressable style={styles.actionBtn} onPress={handleSimpleStep}>
              <Text style={styles.actionBtnText}>
                {currentStepData?.icon} {currentStepData?.name}
              </Text>
            </Pressable>
          )}

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
  progressContainer: {
    height: 8,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  stepDisplay: {
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.lg,
  },
  stepIcon: {
    fontSize: 60,
  },
  stepName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },
  stepNumber: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  patternSection: {
    gap: space.md,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
    textAlign: "center",
  },
  targetPattern: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  selectedPattern: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  patternSlot: {
    width: 60,
    height: 60,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  patternIcon: {
    fontSize: 30,
  },
  pillowSelection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  pillowBtn: {
    width: 70,
    height: 70,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  pillowBtnIcon: {
    fontSize: 35,
  },
  clearBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  actionBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    paddingVertical: space.lg,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 18,
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
