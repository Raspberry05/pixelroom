import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PixelImage } from "../PixelImage";
import {
  getQty,
  inventoryIdForSprite,
  inventoryIdForTile,
  type InventoryState,
} from "../../data/inventory";
import {
  SPRITE_BY_ID,
  SPRITE_CATALOG,
  WORLD_SCALE,
  type EditTool,
  type FurnitureSprite,
  type RoomDocument,
} from "../../data/roomLayout";
import { colors, radii, space } from "../../theme";

type Props = {
  tool: EditTool;
  onChangeTool: (tool: EditTool) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onResetLayout: () => void;
  onToggleFloorFill: () => void;
  document: RoomDocument;
  inventory: InventoryState;
  savedLabel: string;
  status: string | null;
};

const PREVIEW = 16 * WORLD_SCALE;
const SWATCH_H = PREVIEW + 28;

export function RoomPalette({
  tool,
  onChangeTool,
  onDeleteSelected,
  hasSelection,
  onResetLayout,
  onToggleFloorFill,
  document,
  inventory,
  savedLabel,
  status,
}: Props) {
  const furniture = SPRITE_CATALOG.filter((s) => s.paintable && s.tileBrush == null);

  return (
    <View style={styles.wrap}>
      <View style={styles.tools}>
        <ToolChip
          label="Move"
          active={tool.kind === "move"}
          onPress={() => onChangeTool({ kind: "move" })}
        />
        <ToolChip
          label={`Window ×${getQty(inventory, "window_basic")}`}
          active={tool.kind === "window"}
          onPress={() => onChangeTool({ kind: "window" })}
        />
        <ToolChip
          label="Erase"
          active={tool.kind === "erase"}
          onPress={() => onChangeTool({ kind: "erase" })}
        />
        <ToolChip
          label="Delete"
          active={false}
          disabled={!hasSelection}
          onPress={onDeleteSelected}
        />
        <ToolChip
          label={document.floorFill ? "Floor: fill" : "Floor: paint"}
          active={false}
          onPress={onToggleFloorFill}
        />
        <ToolChip label="Reset" active={false} onPress={onResetLayout} />
        <Text style={styles.saved}>{savedLabel}</Text>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.hint}>
        {tool.kind === "paint"
          ? `Selected ${SPRITE_BY_ID[tool.sprite]?.label ?? tool.sprite} — tap the ${SPRITE_BY_ID[tool.sprite]?.defaultAnchor ?? "room"} to place`
          : tool.kind === "tile"
            ? `Paint ${tool.surface} only — tap/drag on the ${tool.surface}`
            : tool.kind === "window"
              ? "Tap the wall to add a window · drag to move"
              : tool.kind === "erase"
                ? "Tap furniture/windows to remove · drag on painted tiles to clear"
                : "Move: drag pieces · pick furniture below, then tap where to place"}
      </Text>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Tiles (inventory)</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.rowScroll}
          contentContainerStyle={styles.palette}
        >
          {(
            [
              { surface: "floor" as const, sprite: "floor" as FurnitureSprite },
              { surface: "wall" as const, sprite: "wallStripe" as FurnitureSprite },
            ] as const
          ).map(({ surface, sprite }) => {
            const meta = SPRITE_BY_ID[sprite];
            const qty = getQty(inventory, inventoryIdForTile(surface));
            const active = tool.kind === "tile" && tool.surface === surface;
            return (
              <Pressable
                key={surface}
                style={[styles.swatch, active && styles.swatchOn, qty <= 0 && styles.swatchEmpty]}
                onPress={() =>
                  onChangeTool(active ? { kind: "move" } : { kind: "tile", surface })
                }
              >
                <View style={styles.swatchArt}>
                  <PixelImage
                    source={meta.source}
                    width={Math.min(PREVIEW, meta.nativeW * WORLD_SCALE)}
                    height={Math.min(PREVIEW, Math.min(meta.nativeH, 16) * WORLD_SCALE)}
                  />
                </View>
                <Text style={styles.swatchLabel} numberOfLines={1}>
                  {surface} ×{qty}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.section}>Furniture (inventory)</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.rowScroll}
          contentContainerStyle={styles.palette}
        >
          {furniture.map((sprite) => {
            const invId = inventoryIdForSprite(sprite.id);
            const qty = invId ? getQty(inventory, invId) : 0;
            const active = tool.kind === "paint" && tool.sprite === sprite.id;
            return (
              <Pressable
                key={sprite.id}
                style={[styles.swatch, active && styles.swatchOn, qty <= 0 && styles.swatchEmpty]}
                onPress={() =>
                  onChangeTool(
                    active ? { kind: "move" } : { kind: "paint", sprite: sprite.id },
                  )
                }
                accessibilityLabel={`${sprite.label} ${qty}`}
              >
                <View style={styles.swatchArt}>
                  <PixelImage
                    source={sprite.source}
                    width={Math.min(PREVIEW, sprite.nativeW * WORLD_SCALE)}
                    height={Math.min(PREVIEW, sprite.nativeH * WORLD_SCALE)}
                  />
                </View>
                <Text style={styles.swatchLabel} numberOfLines={1}>
                  {sprite.label} ×{qty}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function ToolChip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn, disabled && styles.chipDisabled]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingTop: space.sm,
    maxHeight: "42%",
  },
  tools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    paddingHorizontal: space.md,
    alignItems: "center",
    marginBottom: space.xs,
  },
  saved: {
    marginLeft: "auto",
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: "600",
  },
  status: {
    paddingHorizontal: space.md,
    fontSize: 12,
    fontWeight: "700",
    color: colors.danger,
    marginBottom: 4,
  },
  hint: {
    paddingHorizontal: space.md,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: space.sm,
  },
  bodyScroll: {
    flexGrow: 0,
    maxHeight: 200,
  },
  bodyContent: {
    paddingBottom: space.md,
    gap: space.xs,
  },
  section: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  rowScroll: {
    minHeight: SWATCH_H + 8,
  },
  palette: {
    paddingHorizontal: space.md,
    paddingVertical: 4,
    gap: space.sm,
    alignItems: "center",
    minHeight: SWATCH_H,
  },
  swatch: {
    width: 76,
    minHeight: SWATCH_H,
    alignItems: "center",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  swatchOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  swatchEmpty: {
    opacity: 0.45,
  },
  swatchArt: {
    width: PREVIEW,
    height: PREVIEW,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  swatchLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  chipOn: {
    backgroundColor: colors.accentSoft,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
});
