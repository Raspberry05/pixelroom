import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  INTERIOR_ATLAS_H,
  INTERIOR_ATLAS_W,
  type FurnitureItemDefinition,
} from "../../data/devTools";
import {
  createOverlayFrameTemplate,
  seedOverlayFramesFromAtlas,
  type OverlayFrameDefinition,
} from "../../data/overlayFrames";
import { colors, radii, space, typography } from "../../theme";
import { pixelatedImageStyle } from "../PixelImage";
import { FurnitureWorkstation } from "./FurnitureWorkstation";

const ATLAS_SRC = require("../../assets/interior/interior_free.png");

type Props = {
  frames: OverlayFrameDefinition[];
  onChange: (frames: OverlayFrameDefinition[]) => void;
  onSeedFromAtlas?: () => void;
};

function frameAsFurnitureItem(
  frame: OverlayFrameDefinition,
): FurnitureItemDefinition {
  const now = Date.now();
  return {
    id: frame.id,
    sprite: frame.linkedSprite ?? "tv",
    name: frame.label,
    description: "Overlay animation frame",
    category: "decoration",
    price: 0,
    collision: null,
    anchor: "wall",
    gridWidth: 1,
    gridHeight: 1,
    sittingPositions: [],
    interactionHotspots: [],
    spriteX: frame.spriteX,
    spriteY: frame.spriteY,
    spriteWidth: frame.spriteWidth,
    spriteHeight: frame.spriteHeight,
    sellableInStore: false,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt ?? now,
  };
}

function FrameThumb({
  frame,
  size,
}: {
  frame: OverlayFrameDefinition;
  size: number;
}) {
  const w = Math.max(1, frame.spriteWidth);
  const h = Math.max(1, frame.spriteHeight);
  const scale = size / Math.max(w, h);
  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        backgroundColor: "#111",
        borderRadius: 4,
      }}
    >
      <Image
        source={ATLAS_SRC}
        style={[
          pixelatedImageStyle,
          {
            width: INTERIOR_ATLAS_W * scale,
            height: INTERIOR_ATLAS_H * scale,
            marginLeft: -frame.spriteX * scale,
            marginTop: -frame.spriteY * scale,
          },
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}

/**
 * Library of atlas crops used as furniture overlay animation frames.
 * Separate from placeable Furniture — edit crop here, pick in Capabilities.
 */
export function OverlayFramesEditor({
  frames,
  onChange,
  onSeedFromAtlas,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    frames[0]?.id ?? null,
  );
  const selected = frames.find((f) => f.id === selectedId) ?? null;

  const workstationItem = useMemo(
    () => (selected ? frameAsFurnitureItem(selected) : null),
    [selected],
  );

  const patchSelected = (updates: Partial<OverlayFrameDefinition>) => {
    if (!selected) return;
    onChange(
      frames.map((f) =>
        f.id === selected.id
          ? { ...f, ...updates, updatedAt: Date.now() }
          : f,
      ),
    );
  };

  const handleCreate = () => {
    const frame = createOverlayFrameTemplate();
    onChange([...frames, frame]);
    setSelectedId(frame.id);
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete overlay frame “${selected.label}”?`)) return;
    const next = frames.filter((f) => f.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const handleSeed = () => {
    const seeded = seedOverlayFramesFromAtlas(frames);
    onChange(seeded);
    if (onSeedFromAtlas) onSeedFromAtlas();
    if (!selectedId && seeded[0]) setSelectedId(seeded[0].id);
    alert(`Overlay library: ${seeded.length} frame(s). TV A1–B4 seeded from atlas.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Overlay frames</Text>
          <Text style={styles.sidebarHint}>
            Atlas crops for animation sequences. Pick these under Furniture →
            Capabilities → Pick images.
          </Text>
          <View style={styles.sidebarActions}>
            <Pressable style={styles.seedBtn} onPress={handleSeed}>
              <Text style={styles.seedBtnText}>Seed TV screens</Text>
            </Pressable>
            <Pressable style={styles.newBtn} onPress={handleCreate}>
              <Text style={styles.newBtnText}>+ New</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView style={styles.list}>
          {frames.map((frame) => (
            <Pressable
              key={frame.id}
              style={[
                styles.card,
                selectedId === frame.id && styles.cardActive,
              ]}
              onPress={() => setSelectedId(frame.id)}
            >
              <FrameThumb frame={frame} size={36} />
              <View style={styles.cardText}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {frame.label}
                </Text>
                <Text style={styles.cardMeta}>
                  {frame.spriteWidth}×{frame.spriteHeight} · {frame.id}
                </Text>
              </View>
            </Pressable>
          ))}
          {frames.length === 0 ? (
            <Text style={styles.empty}>
              No frames yet. Seed TV screens or create a new crop from the atlas.
            </Text>
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.editor}>
        {!selected || !workstationItem ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Select a frame to crop, or Seed TV screens to load A1–B4 from the
              atlas.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.editorContent}>
            <View style={styles.headerRow}>
              <TextInput
                style={styles.nameInput}
                value={selected.label}
                onChangeText={(label) => patchSelected({ label })}
              />
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
            <Text style={styles.meta}>
              id {selected.id}
              {selected.linkedSprite ? ` · linked ${selected.linkedSprite}` : ""}
            </Text>
            <Text style={styles.hint}>
              Use Crop on the canvas to set the atlas region for this frame.
              Sequences on furniture reference this library by id.
            </Text>
            <View style={styles.workstationBox}>
              <FurnitureWorkstation
                item={workstationItem}
                onChange={(updates) => {
                  patchSelected({
                    spriteX:
                      updates.spriteX != null
                        ? updates.spriteX
                        : selected.spriteX,
                    spriteY:
                      updates.spriteY != null
                        ? updates.spriteY
                        : selected.spriteY,
                    spriteWidth:
                      updates.spriteWidth != null
                        ? updates.spriteWidth
                        : selected.spriteWidth,
                    spriteHeight:
                      updates.spriteHeight != null
                        ? updates.spriteHeight
                        : selected.spriteHeight,
                  });
                }}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", minHeight: 0 },
  sidebar: {
    width: 240,
    borderRightWidth: 2,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarHeader: {
    padding: space.sm,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  sidebarTitle: {
    ...typography.brand,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  sidebarHint: { fontSize: 10, color: colors.inkMuted, lineHeight: 14 },
  sidebarActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
  list: { flex: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardActive: { backgroundColor: colors.accentSoft },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  cardMeta: { fontSize: 10, color: colors.inkMuted },
  empty: { padding: space.md, fontSize: 12, color: colors.inkFaint },
  editor: { flex: 1, minWidth: 0, backgroundColor: colors.surfaceRaised },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyStateText: {
    color: colors.inkMuted,
    textAlign: "center",
    fontSize: 14,
  },
  editorContent: { padding: space.md, gap: space.sm, paddingBottom: 40 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
    paddingVertical: 4,
  },
  deleteBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  meta: { fontSize: 11, color: colors.inkFaint },
  hint: { fontSize: 12, color: colors.inkMuted, lineHeight: 16 },
  workstationBox: {
    minHeight: 360,
    height: 420,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.sm,
    backgroundColor: colors.surface,
  },
});
