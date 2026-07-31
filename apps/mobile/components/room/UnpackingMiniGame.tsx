import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import type { PlacedFurniture } from "../../data/roomLayout";
import { colors, radii, space, typography } from "../../theme";

type Props = {
  visible: boolean;
  furniture: PlacedFurniture | null;
  onComplete: () => void;
  onCancel: () => void;
};

type GamePiece = {
  id: number;
  label: string;
  assembled: boolean;
};

const STEPS = 5;

export function UnpackingMiniGame({
  visible,
  furniture,
  onComplete,
  onCancel,
}: Props) {
  const [pieces, setPieces] = useState<GamePiece[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible && furniture) {
      const initialPieces: GamePiece[] = Array.from({ length: STEPS }, (_, i) => ({
        id: i,
        label: getStepLabel(i),
        assembled: false,
      }));
      setPieces(initialPieces);
      setCurrentStep(0);
    }
  }, [visible, furniture]);

  function getStepLabel(step: number): string {
    const labels = [
      "Open box",
      "Remove packaging",
      "Find instructions",
      "Assemble parts",
      "Final touches",
    ];
    return labels[step] ?? "Step";
  }

  function handlePiecePress(pieceId: number) {
    if (pieceId !== currentStep) {
      // Wrong piece - shake animation
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
      ]).start();
      return;
    }

    // Correct piece - scale animation and assemble
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, assembled: true } : p)),
    );

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep >= STEPS) {
      // Game complete!
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  }

  if (!furniture) return null;

  const progress = (currentStep / STEPS) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Unpack & Build</Text>
            <Text style={styles.subtitle}>Tap the steps in order!</Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <View style={styles.piecesGrid}>
            {pieces.map((piece) => (
              <Pressable
                key={piece.id}
                style={[
                  styles.piece,
                  piece.assembled && styles.pieceAssembled,
                  piece.id === currentStep && styles.pieceNext,
                ]}
                onPress={() => handlePiecePress(piece.id)}
                disabled={piece.assembled}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale:
                          piece.id === currentStep - 1 ? scaleAnim : 1,
                      },
                    ],
                  }}
                >
                  <Text style={styles.pieceNumber}>{piece.id + 1}</Text>
                  <Text
                    style={[
                      styles.pieceLabel,
                      piece.assembled && styles.pieceLabelAssembled,
                    ]}
                  >
                    {piece.label}
                  </Text>
                  {piece.assembled && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Animated.View>
              </Pressable>
            ))}
          </View>

          {currentStep < STEPS && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Tap step {currentStep + 1}: {getStepLabel(currentStep)}
              </Text>
            </View>
          )}

          {currentStep >= STEPS && (
            <View style={styles.complete}>
              <Text style={styles.completeText}>✨ Complete! ✨</Text>
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg,
  },
  container: {
    width: "100%",
    maxWidth: 420,
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
    color: colors.inkMuted,
    fontSize: 14,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  piecesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    justifyContent: "center",
    marginVertical: space.md,
  },
  piece: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: space.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pieceNext: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pieceAssembled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    opacity: 0.7,
  },
  pieceNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
  },
  pieceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  pieceLabelAssembled: {
    color: colors.surfaceRaised,
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 20,
    color: colors.surfaceRaised,
  },
  hint: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  complete: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  completeText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.surfaceRaised,
    textAlign: "center",
  },
  cancelBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
    marginTop: space.sm,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
});
