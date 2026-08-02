import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";
import {
  createFurnitureTemplate,
  deleteFurnitureItem,
  syncAtlasEntryFromFurniture,
  type DevToolsState,
  type FurnitureItemDefinition,
  type FurnitureRotation,
} from "../../data/devTools";
import {
  classifyDevToolsItem,
  type DevToolsCatalogGroup,
} from "../../data/itemGroups";
import type { CollisionKind } from "../../data/inventory";
import type { MiniGameType } from "../../data/minigames";
import { FurnitureCapabilitiesPanel } from "./FurnitureCapabilitiesPanel";
import {
  ClothesItemsEditor,
  DishesItemsEditor,
  GroceryItemsEditor,
  HousingSkuEditor,
  useCatalogExtrasState,
} from "./CatalogExtrasEditors";
import {
  loadHousingSkuCatalog,
  seedDishesFromRecipes,
  seedHousingSkusFromInventory,
} from "../../data/catalogExtras";
import { SPRITE_BY_ID } from "../../data/roomLayout";
import { PixelImage } from "../PixelImage";
import { CatalogCropThumb } from "./CatalogAtlasSection";
import {
  FurnitureWorkstation,
  type WorkstationTool,
} from "./FurnitureWorkstation";

type Props = {
  state: DevToolsState;
  onStateUpdate: (updates: Partial<DevToolsState>) => void;
  onSeedCatalog?: () => void;
};

type ItemFilter = "furniture" | "housing" | "grocery" | "clothes" | "dishes";

const FILTERS: { id: ItemFilter; label: string }[] = [
  { id: "furniture", label: "Furniture" },
  { id: "housing", label: "Housing" },
  { id: "grocery", label: "Grocery" },
  { id: "clothes", label: "Clothes" },
  { id: "dishes", label: "Dishes" },
];

const COLLISION_TYPES: (CollisionKind | null)[] = [
  "solid",
  "seat",
  "rug",
  "surfaceItem",
  "wallDecor",
  null,
];

const MINI_GAME_TYPES: (MiniGameType | undefined)[] = [
  undefined,
  "cooking",
  "frying",
  "cleaning",
  "unpack",
  "tv",
  "bedmaking",
  "watering",
];

const CATEGORIES = ["furniture", "appliance", "decoration", "seating"] as const;

export function FurnitureItemEditor({
  state,
  onStateUpdate,
  onSeedCatalog,
}: Props) {
  const items = state.furnitureItems;
  const [filter, setFilter] = useState<ItemFilter>("furniture");
  const [housingMode, setHousingMode] = useState<"tiles" | "decor">("decor");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [requestedTool, setRequestedTool] = useState<WorkstationTool | null>(
    null,
  );
  const extras = useCatalogExtrasState();

  const filteredItems = useMemo(
    () => items.filter((i) => classifyDevToolsItem(i) === filter),
    [items, filter],
  );

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleCreateNew = () => {
    const newItem = createFurnitureTemplate();
    if (filter === "housing") {
      newItem.collision = "wallDecor";
      newItem.anchor = "wall";
      newItem.category = "decoration";
      newItem.name = "New housing item";
    }
    onStateUpdate({ furnitureItems: [...items, newItem] });
    setSelectedItemId(newItem.id);
    if (filter === "housing") setHousingMode("decor");
  };

  const patchItem = (updates: Partial<FurnitureItemDefinition>) => {
    if (!selectedItemId) return;
    const nextItems = items.map((item) => {
      if (item.id !== selectedItemId) return item;
      const merged: FurnitureItemDefinition = {
        ...item,
        ...updates,
        updatedAt: Date.now(),
      };
      if (merged.rotations && merged.rotations.length > 0) {
        const activeSprite = merged.sprite;
        merged.rotations = merged.rotations.map((rot) =>
          rot.sprite === activeSprite
            ? {
                ...rot,
                spriteX: merged.spriteX ?? rot.spriteX,
                spriteY: merged.spriteY ?? rot.spriteY,
                spriteWidth: merged.spriteWidth ?? rot.spriteWidth,
                spriteHeight: merged.spriteHeight ?? rot.spriteHeight,
                sittingPositions: merged.sittingPositions,
              }
            : rot,
        );
      }
      return merged;
    });
    const updated = nextItems.find((i) => i.id === selectedItemId)!;
    const cropChanged =
      updates.spriteX != null ||
      updates.spriteY != null ||
      updates.spriteWidth != null ||
      updates.spriteHeight != null ||
      updates.spriteAtlasKey != null ||
      updates.sprite != null;
    onStateUpdate({
      furnitureItems: nextItems,
      ...(cropChanged
        ? { spriteAtlas: syncAtlasEntryFromFurniture(state.spriteAtlas, updated) }
        : {}),
    });
  };

  const selectRotation = (rot: FurnitureRotation) => {
    const current = selectedItem;
    if (!current) return;
    const rotations = (current.rotations ?? []).map((r) =>
      r.sprite === current.sprite
        ? { ...r, sittingPositions: current.sittingPositions }
        : r,
    );
    const target = rotations.find((r) => r.sprite === rot.sprite) ?? rot;
    const sits =
      target.sittingPositions && target.sittingPositions.length > 0
        ? target.sittingPositions
        : current.sittingPositions;
    patchItem({
      rotations,
      sprite: rot.sprite,
      spriteX: rot.spriteX,
      spriteY: rot.spriteY,
      spriteWidth: rot.spriteWidth,
      spriteHeight: rot.spriteHeight,
      sittingPositions: sits,
    });
  };

  const handleDelete = () => {
    if (!selectedItemId) return;
    if (
      !confirm(
        "Delete this item from the catalog? Load catalog will not restore catalog_* deletes.",
      )
    ) {
      return;
    }
    const next = deleteFurnitureItem(state, selectedItemId);
    onStateUpdate({
      furnitureItems: next.furnitureItems,
      deletedCatalogIds: next.deletedCatalogIds,
    });
    setSelectedItemId(null);
  };

  const moveCatalogGroup = (group: DevToolsCatalogGroup) => {
    if (!selectedItem) return;
    if (classifyDevToolsItem(selectedItem) === group) return;
    patchItem({ catalogGroup: group });
    setFilter(group);
    if (group === "housing") setHousingMode("decor");
  };

  const filterBar = (
    <View style={styles.filterBar}>
      {FILTERS.map((f) => (
        <Pressable
          key={f.id}
          style={[styles.filterChip, filter === f.id && styles.filterChipOn]}
          onPress={() => {
            setFilter(f.id);
            setSelectedItemId(null);
          }}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === f.id && styles.filterChipTextOn,
            ]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (filter === "grocery") {
    return (
      <View style={styles.container}>
        {filterBar}
        <GroceryItemsEditor
          items={extras.grocery}
          onChange={extras.setGrocery}
        />
      </View>
    );
  }

  if (filter === "clothes") {
    return (
      <View style={styles.container}>
        {filterBar}
        <ClothesItemsEditor
          items={extras.clothes}
          onChange={extras.setClothes}
        />
      </View>
    );
  }

  if (filter === "dishes") {
    return (
      <View style={styles.container}>
        {filterBar}
        <DishesItemsEditor
          items={extras.dishes}
          onChange={extras.setDishes}
        />
      </View>
    );
  }

  if (filter === "housing" && housingMode === "tiles") {
    return (
      <View style={styles.container}>
        {filterBar}
        <View style={styles.housingModeRow}>
          <Pressable
            style={[styles.filterChip, styles.filterChipOn]}
            onPress={() => setHousingMode("tiles")}
          >
            <Text style={[styles.filterChipText, styles.filterChipTextOn]}>
              Tiles & windows
            </Text>
          </Pressable>
          <Pressable
            style={styles.filterChip}
            onPress={() => setHousingMode("decor")}
          >
            <Text style={styles.filterChipText}>Wall decor / floors</Text>
          </Pressable>
          {onSeedCatalog ? (
            <Pressable
              style={styles.seedBtn}
              onPress={() => {
                onSeedCatalog();
                extras.setHousingSkus(
                  seedHousingSkusFromInventory(loadHousingSkuCatalog()),
                );
                extras.setDishes(seedDishesFromRecipes(extras.dishes));
              }}
            >
              <Text style={styles.seedBtnText}>Load catalog</Text>
            </Pressable>
          ) : null}
        </View>
        <HousingSkuEditor
          items={extras.housingSkus}
          onChange={extras.setHousingSkus}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filterBar}
      {filter === "housing" ? (
        <View style={styles.housingModeRow}>
          <Pressable
            style={styles.filterChip}
            onPress={() => setHousingMode("tiles")}
          >
            <Text style={styles.filterChipText}>Tiles & windows</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, styles.filterChipOn]}
            onPress={() => setHousingMode("decor")}
          >
            <Text style={[styles.filterChipText, styles.filterChipTextOn]}>
              Wall decor / floors
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.furnitureRow}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>
              {filter === "housing" ? "Housing objects" : "Furniture"}
            </Text>
            <View style={styles.sidebarActions}>
              {onSeedCatalog ? (
                <Pressable
                  style={styles.seedBtn}
                  onPress={() => {
                    onSeedCatalog();
                    extras.setHousingSkus(
                      seedHousingSkusFromInventory(loadHousingSkuCatalog()),
                    );
                    extras.setDishes(
                      seedDishesFromRecipes(extras.dishes),
                    );
                  }}
                >
                  <Text style={styles.seedBtnText}>Load catalog</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.newBtn} onPress={handleCreateNew}>
                <Text style={styles.newBtnText}>+ New</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.itemList}>
            {filteredItems.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.itemCard,
                  selectedItemId === item.id && styles.itemCardActive,
                ]}
                onPress={() => setSelectedItemId(item.id)}
              >
                <CatalogCropThumb
                  crop={{
                    atlasKey: item.spriteAtlasKey ?? "interior",
                    spriteX: item.spriteX,
                    spriteY: item.spriteY,
                    spriteWidth: item.spriteWidth,
                    spriteHeight: item.spriteHeight,
                  }}
                  size={32}
                  fallback={
                    SPRITE_BY_ID[item.sprite]?.source ? (
                      <PixelImage
                        source={SPRITE_BY_ID[item.sprite]!.source}
                        width={32}
                        height={32}
                      />
                    ) : null
                  }
                />
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.category} · {item.price}c
                    {item.sellableInStore === false ? " · hidden" : " · store"}
                  </Text>
                </View>
              </Pressable>
            ))}

            {filteredItems.length === 0 && (
              <Text style={styles.emptyText}>
                No items yet. Load catalog or create one.
              </Text>
            )}
          </ScrollView>
          {(state.deletedCatalogIds?.length ?? 0) > 0 ? (
            <Text style={styles.tombstoneNote}>
              {state.deletedCatalogIds.length} catalog delete(s) remembered
            </Text>
          ) : null}
        </View>

        <View style={styles.editor}>
          {!selectedItem ||
          classifyDevToolsItem(selectedItem) !== filter ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Select an item — crop, hitbox, sit, interact, and capabilities on
                one canvas.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={styles.editorContent}
            >
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.nameInput}
                    value={selectedItem.name}
                    onChangeText={(name) => patchItem({ name })}
                  />
                  <Text style={styles.spriteId}>{selectedItem.sprite}</Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>

              <View style={styles.propsRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.segmented}>
                    {CATEGORIES.map((c) => (
                      <Pressable
                        key={c}
                        style={[
                          styles.segment,
                          selectedItem.category === c && styles.segmentActive,
                        ]}
                        onPress={() => patchItem({ category: c })}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            selectedItem.category === c &&
                              styles.segmentTextActive,
                          ]}
                        >
                          {c.slice(0, 4)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={[styles.field, { width: 80 }]}>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={String(selectedItem.price)}
                    keyboardType="numeric"
                    onChangeText={(t) =>
                      patchItem({ price: parseInt(t, 10) || 0 })
                    }
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Collision</Text>
                  <View style={styles.segmented}>
                    {COLLISION_TYPES.map((type) => (
                      <Pressable
                        key={type ?? "none"}
                        style={[
                          styles.segment,
                          selectedItem.collision === type &&
                            styles.segmentActive,
                        ]}
                        onPress={() => patchItem({ collision: type })}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            selectedItem.collision === type &&
                              styles.segmentTextActive,
                          ]}
                        >
                          {type ?? "none"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mini-game</Text>
                  <View style={styles.segmented}>
                    {MINI_GAME_TYPES.map((mg) => (
                      <Pressable
                        key={mg ?? "none"}
                        style={[
                          styles.segment,
                          selectedItem.miniGame === mg && styles.segmentActive,
                        ]}
                        onPress={() => patchItem({ miniGame: mg })}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            selectedItem.miniGame === mg &&
                              styles.segmentTextActive,
                          ]}
                        >
                          {mg ?? "none"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>In Store catalog</Text>
                  <View style={styles.segmented}>
                    <Pressable
                      style={[
                        styles.segment,
                        selectedItem.sellableInStore !== false &&
                          styles.segmentActive,
                      ]}
                      onPress={() => patchItem({ sellableInStore: true })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selectedItem.sellableInStore !== false &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Sellable
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.segment,
                        selectedItem.sellableInStore === false &&
                          styles.segmentActive,
                      ]}
                      onPress={() => patchItem({ sellableInStore: false })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          selectedItem.sellableInStore === false &&
                            styles.segmentTextActive,
                        ]}
                      >
                        Hidden
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Items / Store group</Text>
                  <View style={styles.segmented}>
                    {(["furniture", "housing"] as const).map((group) => {
                      const on = classifyDevToolsItem(selectedItem) === group;
                      return (
                        <Pressable
                          key={group}
                          style={[styles.segment, on && styles.segmentActive]}
                          onPress={() => moveCatalogGroup(group)}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              on && styles.segmentTextActive,
                            ]}
                          >
                            {group === "furniture" ? "Furniture" : "Housing"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <FurnitureCapabilitiesPanel
                item={selectedItem}
                onChange={patchItem}
                onSelectRotation={selectRotation}
                onOpenOverlayTool={() => setRequestedTool("overlay")}
              />

              <View style={styles.workstationBox}>
                <FurnitureWorkstation
                  item={selectedItem}
                  onChange={patchItem}
                  requestedTool={requestedTool}
                  onRequestedToolConsumed={() => setRequestedTool(null)}
                />
              </View>

              <Pressable
                style={styles.advancedToggle}
                onPress={() => setShowAdvanced((v) => !v)}
              >
                <Text style={styles.advancedToggleText}>
                  {showAdvanced ? "Hide" : "Show"} advanced numbers
                </Text>
              </Pressable>

              {showAdvanced ? (
                <View style={styles.advanced}>
                  <Text style={styles.label}>
                    Crop x,y,w,h · grid · hitPad (prefer canvas)
                  </Text>
                  <View style={styles.numRow}>
                    {(
                      [
                        ["spriteX", selectedItem.spriteX ?? 0],
                        ["spriteY", selectedItem.spriteY ?? 0],
                        ["spriteWidth", selectedItem.spriteWidth ?? 16],
                        ["spriteHeight", selectedItem.spriteHeight ?? 16],
                        ["gridWidth", selectedItem.gridWidth],
                        ["gridHeight", selectedItem.gridHeight],
                        ["hitPad", selectedItem.hitPad ?? 0],
                      ] as const
                    ).map(([key, val]) => (
                      <View key={key} style={styles.numField}>
                        <Text style={styles.numLabel}>{key}</Text>
                        <TextInput
                          style={styles.input}
                          value={String(val)}
                          keyboardType="numeric"
                          onChangeText={(t) =>
                            patchItem({ [key]: parseInt(t, 10) || 0 })
                          }
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    paddingBottom: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  housingModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceRaised,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  filterChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  filterChipText: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  filterChipTextOn: { color: colors.ink },
  furnitureRow: { flex: 1, flexDirection: "row", minHeight: 0 },
  sidebar: {
    width: 220,
    borderRightWidth: 2,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarHeader: {
    padding: space.sm,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  sidebarTitle: {
    ...typography.brand,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  sidebarActions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  seedBtn: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  seedBtnText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  newBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  newBtnText: { fontSize: 11, fontWeight: "700", color: colors.surfaceRaised },
  itemList: { flex: 1 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemCardActive: { backgroundColor: colors.accentSoft },
  itemTextCol: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  itemMeta: { fontSize: 10, color: colors.inkMuted },
  emptyText: {
    padding: space.md,
    color: colors.inkFaint,
    fontSize: 12,
  },
  tombstoneNote: {
    padding: 6,
    fontSize: 10,
    color: colors.inkMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editor: { flex: 1, minWidth: 0, backgroundColor: colors.surfaceRaised },
  editorScroll: { flex: 1 },
  editorContent: { padding: space.md, gap: space.sm, paddingBottom: 40 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyStateText: { color: colors.inkMuted, textAlign: "center", fontSize: 14 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  nameInput: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
    paddingVertical: 4,
  },
  spriteId: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  deleteBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  propsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  field: { gap: 4 },
  label: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.surface,
    minWidth: 56,
  },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  segment: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.borderStrong,
  },
  segmentText: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  segmentTextActive: { color: colors.surfaceRaised },
  workstationBox: {
    minHeight: 360,
    height: 420,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.sm,
    backgroundColor: colors.surface,
  },
  advancedToggle: { alignSelf: "flex-start", paddingVertical: 6 },
  advancedToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    textDecorationLine: "underline",
  },
  advanced: { gap: 6 },
  numRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  numField: { width: 100, gap: 2 },
  numLabel: { fontSize: 9, color: colors.inkFaint },
});
