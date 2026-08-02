import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { FurnitureItemDefinition, FurnitureRotation } from "../../data/devTools";
import {
  INTERIOR_ATLAS_H,
  INTERIOR_ATLAS_W,
} from "../../data/devTools";
import {
  buildTvVisualStates,
  createBlankVisualStates,
  DEFAULT_TV_OVERLAY,
  defaultOverlayPlacement,
  newSequenceState,
  type FurnitureOverlayFrame,
  type FurnitureVisualState,
} from "../../data/furnitureVisual";
import { CHAIR_ROTATIONS, isChairSprite } from "../../data/inventory";
import {
  listLibraryOverlayCandidates,
  type OverlayFrameDefinition,
} from "../../data/overlayFrames";
import { SPRITE_BY_ID } from "../../data/roomLayout";
import { colors, radii, space } from "../../theme";
import { pixelatedImageStyle } from "../PixelImage";

const ATLAS_SRC = require("../../assets/interior/interior_free.png");

type Props = {
  item: FurnitureItemDefinition;
  onChange: (updates: Partial<FurnitureItemDefinition>) => void;
  /** Persist sits on the leaving facing, then load the target facing. */
  onSelectRotation?: (rot: FurnitureRotation) => void;
  onOpenOverlayTool: () => void;
};

const CHAIR_LABEL: Record<string, string> = {
  chairDown: "↓",
  chairLeft: "←",
  chairRight: "→",
  chairUp: "↑",
};

function libraryThumb(frame: OverlayFrameDefinition, size: number) {
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
 * Enable rotations / overlays on any furniture, pick animation frames,
 * and jump to the Overlay placement tool.
 */
export function FurnitureCapabilitiesPanel({
  item,
  onChange,
  onSelectRotation,
  onOpenOverlayTool,
}: Props) {
  const hasRotations = (item.rotations?.length ?? 0) > 0;
  const hasOverlay = (item.visualStates?.length ?? 0) > 0;
  const [editingStateId, setEditingStateId] = useState<string | null>(
    item.activeVisualStateId ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const states = item.visualStates ?? [];
  const activeStateId = editingStateId ?? item.activeVisualStateId ?? states[0]?.id;
  const activeState = states.find((s) => s.id === activeStateId) ?? states[0];

  const libraryFrames = listLibraryOverlayCandidates();
  const chassisW = Math.max(1, item.spriteWidth ?? 16);
  const chassisH = Math.max(1, item.spriteHeight ?? 16);

  const enableRotations = () => {
    if (hasRotations) return;
    if (isChairSprite(item.sprite) || item.sprite === "chairDown") {
      const rotations: FurnitureRotation[] = CHAIR_ROTATIONS.map((sprite) => {
        const meta = SPRITE_BY_ID[sprite];
        return {
          sprite,
          label: CHAIR_LABEL[sprite] ?? sprite,
          spriteX: item.sprite === sprite ? item.spriteX : 0,
          spriteY: item.sprite === sprite ? item.spriteY : 0,
          spriteWidth: meta?.nativeW ?? 16,
          spriteHeight: meta?.nativeH ?? 16,
          sittingPositions:
            item.sprite === sprite ? item.sittingPositions : undefined,
        };
      });
      onChange({
        rotations,
        sprite: "chairDown",
        name: item.name || "Chair",
      });
      return;
    }
    onChange({
      rotations: [
        {
          sprite: item.sprite,
          label: "A",
          spriteX: item.spriteX,
          spriteY: item.spriteY,
          spriteWidth: item.spriteWidth,
          spriteHeight: item.spriteHeight,
          sittingPositions: item.sittingPositions,
        },
      ],
    });
  };

  const disableRotations = () => {
    onChange({ rotations: undefined });
  };

  const enableOverlay = () => {
    if (hasOverlay) return;
    const visualStates =
      item.sprite === "tv" ? buildTvVisualStates() : createBlankVisualStates();
    const overlayPlacement =
      item.sprite === "tv"
        ? DEFAULT_TV_OVERLAY
        : defaultOverlayPlacement(chassisW, chassisH);
    const activeVisualStateId =
      visualStates.find((s) => s.kind === "sequence")?.id ?? visualStates[0]?.id;
    onChange({
      visualStates,
      overlayPlacement,
      activeVisualStateId,
    });
    setEditingStateId(activeVisualStateId ?? null);
  };

  const disableOverlay = () => {
    onChange({
      visualStates: undefined,
      overlayPlacement: undefined,
      activeVisualStateId: undefined,
    });
    setEditingStateId(null);
    setPickerOpen(false);
  };

  const patchStates = (visualStates: FurnitureVisualState[]) => {
    onChange({
      visualStates,
      activeVisualStateId:
        visualStates.find((s) => s.id === activeStateId)?.id ??
        visualStates[0]?.id,
      overlayPlacement:
        item.overlayPlacement ?? defaultOverlayPlacement(chassisW, chassisH),
    });
  };

  const updateActiveState = (patch: Partial<FurnitureVisualState>) => {
    if (!activeState) return;
    patchStates(
      states.map((s) => (s.id === activeState.id ? { ...s, ...patch } : s)),
    );
  };

  const toggleLibraryFrame = (lib: OverlayFrameDefinition) => {
    if (!activeState || activeState.kind !== "sequence") return;
    const frames = activeState.frames ?? [];
    const exists = frames.some((f) => f.libraryId === lib.id);
    const next: FurnitureOverlayFrame[] = exists
      ? frames.filter((f) => f.libraryId !== lib.id)
      : [
          ...frames,
          {
            id: `frm_${lib.id}_${Date.now().toString(36)}`,
            label: lib.label,
            libraryId: lib.id,
            sprite: lib.linkedSprite,
          },
        ];
    updateActiveState({ frames: next });
  };

  const removeSequenceFrame = (frameId: string) => {
    if (!activeState?.frames) return;
    updateActiveState({
      frames: activeState.frames.filter((f) => f.id !== frameId),
    });
  };

  const moveFrame = (index: number, dir: -1 | 1) => {
    if (!activeState?.frames) return;
    const next = [...activeState.frames];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    updateActiveState({ frames: next });
  };

  const addSequence = () => {
    const st = newSequenceState(`Seq ${(states.filter((s) => s.kind === "sequence").length + 1)}`);
    const visualStates = [...states, st];
    patchStates(visualStates);
    setEditingStateId(st.id);
    onChange({
      visualStates,
      activeVisualStateId: st.id,
      overlayPlacement:
        item.overlayPlacement ?? defaultOverlayPlacement(chassisW, chassisH),
    });
  };

  const removeState = (id: string) => {
    if (states.length <= 1) {
      disableOverlay();
      return;
    }
    const visualStates = states.filter((s) => s.id !== id);
    const nextActive =
      activeStateId === id ? visualStates[0]?.id : activeStateId;
    onChange({
      visualStates,
      activeVisualStateId: nextActive,
    });
    setEditingStateId(nextActive ?? null);
  };

  const applyTvPreset = () => {
    onChange({
      visualStates: buildTvVisualStates(),
      activeVisualStateId: "channelA",
      overlayPlacement: DEFAULT_TV_OVERLAY,
    });
    setEditingStateId("channelA");
  };

  const placement = item.overlayPlacement;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Capabilities</Text>
      <Text style={styles.hint}>
        Turn on features this object needs. Overlay frames are edited in the
        Overlays tab (crop/add), then picked here into a sequence. Rotations =
        alternate facings.
      </Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, hasRotations && styles.toggleOn]}
          onPress={() => (hasRotations ? disableRotations() : enableRotations())}
        >
          <Text style={[styles.toggleText, hasRotations && styles.toggleTextOn]}>
            {hasRotations ? "✓ Rotations" : "+ Rotations"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, hasOverlay && styles.toggleOn]}
          onPress={() => (hasOverlay ? disableOverlay() : enableOverlay())}
        >
          <Text style={[styles.toggleText, hasOverlay && styles.toggleTextOn]}>
            {hasOverlay ? "✓ Overlay / states" : "+ Overlay / states"}
          </Text>
        </Pressable>
      </View>

      {hasRotations ? (
        <View style={styles.section}>
          <Text style={styles.label}>Rotation facings</Text>
          <View style={styles.chipRow}>
            {(item.rotations ?? []).map((rot) => {
              const on = item.sprite === rot.sprite;
              return (
                <Pressable
                  key={rot.sprite}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() =>
                    onSelectRotation
                      ? onSelectRotation(rot)
                      : onChange({
                          sprite: rot.sprite,
                          spriteX: rot.spriteX,
                          spriteY: rot.spriteY,
                          spriteWidth: rot.spriteWidth,
                          spriteHeight: rot.spriteHeight,
                          sittingPositions:
                            rot.sittingPositions ?? item.sittingPositions,
                        })
                  }
                >
                  <Text style={styles.chipText}>
                    {rot.label} · {rot.sprite}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Select a facing to edit its crop / sit seats on the canvas below.
          </Text>
        </View>
      ) : null}

      {hasOverlay ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.label}>Visual states</Text>
            <View style={styles.rowActions}>
              {item.sprite === "tv" ||
              states.some((s) => s.id === "channelA") ? null : (
                <Pressable style={styles.smallBtn} onPress={applyTvPreset}>
                  <Text style={styles.smallBtnText}>TV preset A/B</Text>
                </Pressable>
              )}
              <Pressable style={styles.smallBtn} onPress={addSequence}>
                <Text style={styles.smallBtnText}>+ Sequence</Text>
              </Pressable>
              <Pressable
                style={[styles.smallBtn, styles.accentBtn]}
                onPress={onOpenOverlayTool}
              >
                <Text style={[styles.smallBtnText, styles.accentBtnText]}>
                  Place overlay ▸
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.chipRow}>
            {states.map((st) => {
              const on = st.id === activeStateId;
              return (
                <Pressable
                  key={st.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => {
                    setEditingStateId(st.id);
                    onChange({ activeVisualStateId: st.id });
                  }}
                >
                  <Text style={styles.chipText}>
                    {st.label}
                    {st.kind === "sequence"
                      ? ` (${st.frames?.length ?? 0})`
                      : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {placement ? (
            <Text style={styles.meta}>
              Overlay box {placement.offsetX},{placement.offsetY} ·{" "}
              {placement.width}×{placement.height}px — drag with Overlay tool
            </Text>
          ) : null}

          {activeState ? (
            <View style={styles.stateEditor}>
              <View style={styles.stateEditorHead}>
                <TextInput
                  style={styles.nameInput}
                  value={activeState.label}
                  onChangeText={(label) => updateActiveState({ label })}
                />
                <Text style={styles.meta}>{activeState.kind}</Text>
                {activeState.id !== "off" ? (
                  <Pressable onPress={() => removeState(activeState.id)}>
                    <Text style={styles.danger}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>

              {activeState.kind === "base" ? (
                <Text style={styles.hint}>
                  Off / base — no animation frames. A dark fill covers the
                  overlay box in-room.
                </Text>
              ) : (
                <>
                  <View style={styles.frameMsRow}>
                    <Text style={styles.label}>Frame ms</Text>
                    <TextInput
                      style={styles.numInput}
                      keyboardType="numeric"
                      value={String(activeState.frameMs ?? 180)}
                      onChangeText={(t) =>
                        updateActiveState({
                          frameMs: Math.max(40, parseInt(t, 10) || 180),
                        })
                      }
                    />
                    <Pressable
                      style={styles.smallBtn}
                      onPress={() => setPickerOpen((v) => !v)}
                    >
                      <Text style={styles.smallBtnText}>
                        {pickerOpen ? "Hide image picker" : "Pick images"}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.label}>
                    Sequence frames ({activeState.frames?.length ?? 0}) — order =
                    animation order
                  </Text>
                  <View style={styles.frameList}>
                    {(activeState.frames ?? []).length === 0 ? (
                      <Text style={styles.hint}>
                        No images yet. Open Pick images (from the Overlays
                        library), or Seed TV screens in the Overlays tab first.
                      </Text>
                    ) : (
                      (activeState.frames ?? []).map((f, i) => {
                        const lib = f.libraryId
                          ? libraryFrames.find((l) => l.id === f.libraryId)
                          : undefined;
                        return (
                          <View key={f.id} style={styles.frameRow}>
                            {lib ? libraryThumb(lib, 28) : null}
                            <Text style={styles.frameName} numberOfLines={1}>
                              {i + 1}. {f.label}
                            </Text>
                            <Pressable onPress={() => moveFrame(i, -1)}>
                              <Text style={styles.frameBtn}>↑</Text>
                            </Pressable>
                            <Pressable onPress={() => moveFrame(i, 1)}>
                              <Text style={styles.frameBtn}>↓</Text>
                            </Pressable>
                            <Pressable onPress={() => removeSequenceFrame(f.id)}>
                              <Text style={styles.danger}>×</Text>
                            </Pressable>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {pickerOpen ? (
                    <View style={styles.picker}>
                      <Text style={styles.label}>
                        Overlay library — tap to add / remove. Edit crops in the
                        Overlays tab.
                      </Text>
                      {libraryFrames.length === 0 ? (
                        <Text style={styles.hint}>
                          Library empty. Open DevTools → Overlays → Seed TV
                          screens (or + New).
                        </Text>
                      ) : (
                        <View style={styles.pickerGrid}>
                          {libraryFrames.map((lib) => {
                            const on = (activeState.frames ?? []).some(
                              (f) => f.libraryId === lib.id,
                            );
                            return (
                              <Pressable
                                key={lib.id}
                                style={[
                                  styles.pickCell,
                                  on && styles.pickCellOn,
                                ]}
                                onPress={() => toggleLibraryFrame(lib)}
                              >
                                {libraryThumb(lib, 36)}
                                <Text
                                  style={styles.pickLabel}
                                  numberOfLines={1}
                                >
                                  {lib.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    padding: space.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 13, fontWeight: "800", color: colors.ink },
  hint: { fontSize: 11, color: colors.inkMuted, lineHeight: 15 },
  meta: { fontSize: 11, color: colors.inkFaint },
  label: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  toggleOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  toggleText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  toggleTextOn: { color: colors.ink },
  section: { gap: 6, marginTop: 4 },
  sectionHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  smallBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  smallBtnText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  accentBtn: { backgroundColor: "#EC4899", borderColor: "#9D174D" },
  accentBtnText: { color: "#fff" },
  stateEditor: {
    gap: 6,
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateEditorHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 2,
  },
  frameMsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  numInput: {
    width: 64,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.ink,
  },
  frameList: { gap: 4 },
  frameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  frameName: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.ink },
  frameBtn: { fontSize: 14, fontWeight: "800", color: colors.ink, padding: 4 },
  danger: { fontSize: 12, fontWeight: "700", color: colors.danger, padding: 4 },
  picker: { gap: 6, marginTop: 4 },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickCell: {
    width: 72,
    alignItems: "center",
    gap: 2,
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickCellOn: {
    borderColor: "#EC4899",
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  pickLabel: { fontSize: 9, fontWeight: "600", color: colors.inkMuted },
});
