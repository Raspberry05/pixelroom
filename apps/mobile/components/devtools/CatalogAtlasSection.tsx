import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  cropAsFurnitureItem,
  listAtlasPacks,
  pickCropUpdates,
  resolveAtlasPack,
  type AtlasCropFields,
} from "../../data/atlasCrop";
import type { FurnitureItemDefinition } from "../../data/devTools";
import { colors, radii, space } from "../../theme";
import {
  AtlasCropThumb,
  FurnitureWorkstation,
} from "./FurnitureWorkstation";

const CROP_TOOLS = ["pan", "crop"] as const;

type Props = {
  itemId: string;
  itemName: string;
  crop: AtlasCropFields;
  onChangeCrop: (updates: Partial<AtlasCropFields>) => void;
};

/** Atlas pack picker + pan/crop workstation shared by grocery, clothes, dishes. */
export function CatalogAtlasSection({
  itemId,
  itemName,
  crop,
  onChangeCrop,
}: Props) {
  const pack = useMemo(
    () => resolveAtlasPack(crop.atlasKey),
    [crop.atlasKey],
  );
  const packs = useMemo(() => listAtlasPacks(), []);
  const workstationItem = useMemo(
    () => cropAsFurnitureItem(itemId, itemName, crop),
    [itemId, itemName, crop],
  );

  const onWorkstationChange = (updates: Partial<FurnitureItemDefinition>) => {
    const cropUpdates = pickCropUpdates(updates);
    if (Object.keys(cropUpdates).length === 0) return;
    onChangeCrop(cropUpdates);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Atlas / sheet</Text>
      <View style={styles.chips}>
        {packs.map((p) => {
          const on = pack.id === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() =>
                onChangeCrop({
                  atlasKey: p.id,
                  spriteX: 0,
                  spriteY: 0,
                  spriteWidth: Math.min(16, p.width),
                  spriteHeight: Math.min(16, p.height),
                })
              }
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.workstation}>
        <FurnitureWorkstation
          item={workstationItem}
          onChange={onWorkstationChange}
          atlasSource={pack.source}
          atlasWidth={pack.width}
          atlasHeight={pack.height}
          enabledTools={[...CROP_TOOLS]}
        />
      </View>
    </View>
  );
}

export function CatalogCropThumb({
  crop,
  size = 28,
  fallback,
}: {
  crop: AtlasCropFields | null | undefined;
  size?: number;
  fallback?: ReactNode;
}) {
  if (
    !crop ||
    crop.spriteWidth == null ||
    crop.spriteHeight == null ||
    crop.spriteWidth <= 0 ||
    crop.spriteHeight <= 0
  ) {
    return <>{fallback ?? null}</>;
  }
  const pack = resolveAtlasPack(crop.atlasKey);
  return (
    <AtlasCropThumb
      item={crop}
      size={size}
      atlasSource={pack.source}
      atlasWidth={pack.width}
      atlasHeight={pack.height}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  label: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  chipTextOn: { color: colors.ink },
  workstation: {
    minHeight: 360,
    height: 400,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.sm,
    backgroundColor: colors.surface,
  },
});
