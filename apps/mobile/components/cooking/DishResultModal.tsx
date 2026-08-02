import { Modal, Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { colors, radii, space, typography } from "../../theme";
import type { CookedDish } from "../../data/recipes";
import { dishForRecipe } from "../../data/catalogExtras";
import { RecipeBookModal } from "./RecipeBookModal";
import { CatalogCropThumb } from "../devtools/CatalogAtlasSection";

type Props = {
  visible: boolean;
  dish: CookedDish | null;
  onClose: () => void;
};

export function DishResultModal({ visible, dish, onClose }: Props) {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [recipeBookOpen, setRecipeBookOpen] = useState(false);
  const [sparkles] = useState(
    Array.from({ length: 8 }, () => ({
      rotate: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  );

  useEffect(() => {
    if (visible && dish) {
      // Dish reveal animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Sparkle animations for perfect dishes
      if (dish.quality === "perfect") {
        sparkles.forEach((sparkle, i) => {
          Animated.parallel([
            Animated.timing(sparkle.scale, {
              toValue: 1,
              duration: 400,
              delay: i * 50,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.rotate, {
              toValue: 1,
              duration: 1000,
              delay: i * 50,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }
    } else {
      scaleAnim.setValue(0);
      sparkles.forEach((sparkle) => {
        sparkle.scale.setValue(0);
        sparkle.rotate.setValue(0);
      });
    }
  }, [visible, dish]);

  const dishArt = useMemo(
    () => (dish ? dishForRecipe(dish.recipeId) : null),
    [dish?.recipeId],
  );

  if (!dish) return null;

  const qualityText =
    dish.quality === "perfect"
      ? "Perfect! ⭐"
      : dish.quality === "good"
        ? "Delicious! 👍"
        : "Well... it's edible? 🤷";

  const qualityColor =
    dish.quality === "perfect"
      ? "#FFD700"
      : dish.quality === "good"
        ? colors.accent
        : "#8B7355";

  return (
    <>
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.header}>You cooked...</Text>

          <View style={styles.dishContainer}>
            {/* Sparkles for perfect dishes */}
            {dish.quality === "perfect" &&
              sparkles.map((sparkle, i) => {
                const angle = (i * 360) / sparkles.length;
                const rotate = sparkle.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                });
                
                return (
                  <Animated.Text
                    key={i}
                    style={[
                      styles.sparkle,
                      {
                        transform: [
                          { translateX: 60 * Math.cos((angle * Math.PI) / 180) },
                          { translateY: 60 * Math.sin((angle * Math.PI) / 180) },
                          { scale: sparkle.scale },
                          { rotate },
                        ],
                      },
                    ]}
                  >
                    ✨
                  </Animated.Text>
                );
              })}

            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
              }}
            >
              <CatalogCropThumb
                crop={dishArt ?? undefined}
                size={72}
                fallback={
                  <Text style={styles.dishEmoji}>{dish.emoji}</Text>
                }
              />
            </Animated.View>
          </View>

          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishDescription}>{dish.description}</Text>

          <View style={[styles.qualityBadge, { backgroundColor: qualityColor }]}>
            <Text style={styles.qualityText}>{qualityText}</Text>
          </View>

          {dish.quality === "mystery" && (
            <Pressable onPress={() => setRecipeBookOpen(true)}>
              <Text style={styles.mysteryHint}>
                💡 Open the recipe book for known dishes
              </Text>
            </Pressable>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Finish</Text>
          </Pressable>
        </View>
      </View>
    </Modal>

    <RecipeBookModal
      visible={recipeBookOpen}
      onClose={() => setRecipeBookOpen(false)}
    />
    </>
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
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    padding: space.xl,
    alignItems: "center",
    gap: space.md,
  },
  header: {
    ...typography.body,
    fontSize: 16,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  dishContainer: {
    position: "relative",
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: space.md,
  },
  sparkle: {
    position: "absolute",
    fontSize: 24,
  },
  dishEmoji: {
    fontSize: 100,
  },
  dishName: {
    ...typography.brand,
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  dishDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  qualityBadge: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginTop: space.sm,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  mysteryHint: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: space.xs,
    fontStyle: "italic",
  },
  closeBtn: {
    width: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.md,
    alignItems: "center",
    marginTop: space.md,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
});
