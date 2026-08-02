import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, space, typography } from "../../theme";
import { getGroceryItem } from "../../data/groceryItems";
import {
  RECIPES,
  type ApplianceType,
  type Recipe,
} from "../../data/recipes";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const APPLIANCE_LABEL: Record<ApplianceType, string> = {
  stove: "Stove",
  oven: "Oven",
  fryer: "Fryer",
  microwave: "Microwave",
  blender: "Blender",
};

function formatIngredients(recipe: Recipe): string {
  return recipe.ingredients
    .map((ing) => {
      const item = getGroceryItem(ing.ingredientId);
      const emoji = item?.emoji ?? "•";
      const name = item?.name ?? ing.ingredientId;
      return `${emoji} ${name} ×${ing.amount}`;
    })
    .join("  ·  ");
}

export function RecipeBookModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>📖 Recipe Book</Text>
            <Text style={styles.subtitle}>
              Match these ingredients when you cook
            </Text>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
          >
            {RECIPES.map((recipe) => (
              <View key={recipe.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.emoji}>{recipe.emoji}</Text>
                  <View style={styles.cardTitles}>
                    <Text style={styles.name}>{recipe.name}</Text>
                    <Text style={styles.description}>{recipe.description}</Text>
                  </View>
                </View>

                <Text style={styles.ingredients}>{formatIngredients(recipe)}</Text>

                <View style={styles.metaRow}>
                  {recipe.requiredAppliance ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        Needs {APPLIANCE_LABEL[recipe.requiredAppliance]}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, styles.badgeMuted]}>
                      <Text style={styles.badgeTextMuted}>Any kitchen</Text>
                    </View>
                  )}
                  {recipe.flexibleAmounts ? (
                    <View style={[styles.badge, styles.badgeSoft]}>
                      <Text style={styles.badgeTextSoft}>Amounts ±1 OK</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    maxHeight: "88%",
  },
  header: {
    padding: space.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    ...typography.brand,
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    padding: space.md,
    gap: space.sm,
    paddingBottom: space.lg,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  emoji: {
    fontSize: 36,
    lineHeight: 40,
  },
  cardTitles: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  description: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  ingredients: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeMuted: {
    backgroundColor: colors.bgDeep,
    borderColor: colors.border,
  },
  badgeSoft: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  badgeTextMuted: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
  },
  badgeTextSoft: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
  },
  footer: {
    padding: space.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  closeBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.md,
    alignItems: "center",
  },
  closeText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
});
