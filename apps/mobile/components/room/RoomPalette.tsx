import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CatalogArt } from "../AtlasSprite";
import {
  CHAIR_ROTATIONS,
  getQty,
  inventoryIdForSprite,
  inventoryIdForTile,
  isChairSprite,
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
import { cropOverride } from "../../data/spriteOverrides";
import { colors, radii, space } from "../../theme";

const CHAIR_ROT_LABEL: Record<string, string> = {
  chairDown: "↓",
  chairLeft: "←",
  chairRight: "→",
  chairUp: "↑",
};

type Props = {
  tool: EditTool;
  onChangeTool: (tool: EditTool) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onResetLayout: () => void;
  onToggleFloorFill: () => void;
  onImportLayout?: () => void;
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
  onImportLayout,
  document,
  inventory,
  savedLabel,
  status,
}: Props) {
  const furniture = SPRITE_CATALOG.filter((s) => s.paintable && s.tileBrush == null);
  const chairToolActive =
    tool.kind === "paint" && isChairSprite(tool.sprite);

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
        {onImportLayout ? (
          <ToolChip
            label="Import/Export"
            active={false}
            onPress={onImportLayout}
          />
        ) : null}
        <Text style={styles.saved}>{savedLabel}</Text>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.hint}>
        {tool.kind === "paint"
          ? isChairSprite(tool.sprite)
            ? "Chair — pick facing below, then tap the floor to place"
            : `Selected ${SPRITE_BY_ID[tool.sprite]?.label ?? tool.sprite} — tap the ${SPRITE_BY_ID[tool.sprite]?.defaultAnchor ?? "room"} to place`
          : tool.kind === "tile"
            ? `Paint ${tool.surface} only — tap/drag on the ${tool.surface}`
            : tool.kind === "window"
              ? "Tap the wall to add a window · drag to move"
              : tool.kind === "erase"
                ? "Tap furniture/windows to remove · drag on painted tiles to clear"
                : "Move: drag pieces · pick furniture below, then tap where to place"}
      </Text>

      {chairToolActive ? (
        <View style={styles.rotRow}>
          <Text style={styles.rotLabel}>Facing</Text>
          {CHAIR_ROTATIONS.map((sprite) => {
            const active = tool.kind === "paint" && tool.sprite === sprite;
            return (
              <Pressable
                key={sprite}
                style={[styles.rotChip, active && styles.rotChipOn]}
                onPress={() => onChangeTool({ kind: "paint", sprite })}
                accessibilityLabel={`Chair facing ${CHAIR_ROT_LABEL[sprite]}`}
              >
                <Text style={styles.rotChipText}>{CHAIR_ROT_LABEL[sprite]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/*
        Horizontal rows only — a vertical ScrollView with maxHeight was
        reserving a tall empty band under the swatches in edit mode.
      */}
      <View style={styles.body}>
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
                  <CatalogArt
                    crop={cropOverride(sprite)}
                    fallbackSource={meta.source}
                    width={Math.min(PREVIEW, meta.nativeW * WORLD_SCALE)}
                    height={Math.min(
                      PREVIEW,
                      Math.min(meta.nativeH, 16) * WORLD_SCALE,
                    )}
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
            const active =
              tool.kind === "paint" &&
              (tool.sprite === sprite.id ||
                (isChairSprite(sprite.id) && isChairSprite(tool.sprite)));
            return (
              <Pressable
                key={sprite.id}
                style={[styles.swatch, active && styles.swatchOn, qty <= 0 && styles.swatchEmpty]}
                onPress={() =>
                  onChangeTool(
                    active && tool.kind === "paint" && tool.sprite === sprite.id
                      ? { kind: "move" }
                      : { kind: "paint", sprite: sprite.id },
                  )
                }
                accessibilityLabel={`${sprite.label} ${qty}`}
              >
                <View style={styles.swatchArt}>
                  <CatalogArt
                    crop={cropOverride(sprite.id)}
                    fallbackSource={sprite.source}
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
      </View>
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
    paddingBottom: space.sm,
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
    marginBottom: space.xs,
  },
  rotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.xs,
  },
  rotLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  rotChip: {
    minWidth: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
  },
  rotChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  rotChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  body: {
    gap: 2,
    paddingBottom: space.xs,
  },
  section: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: 2,
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  rowScroll: {
    flexGrow: 0,
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
