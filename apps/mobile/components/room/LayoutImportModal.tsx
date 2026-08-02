import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";
import {
  analyzeLayoutImport,
  applyLayoutImport,
  parseLayoutJson,
  type ExpansionImportHold,
  type LayoutNeed,
} from "../../data/layoutImport";
import type { RoomDocument } from "../../data/roomLayout";
import { refund, type InventoryState } from "../../data/inventory";

type Props = {
  visible: boolean;
  roomDocument: RoomDocument;
  inventory: InventoryState;
  coins: number;
  buyerKey: string;
  onChangeDocument: (doc: RoomDocument) => void;
  onChangeInventory: (inv: InventoryState) => void;
  onChangeCoins: (coins: number) => void;
  onClose: () => void;
  onStatus: (message: string | null) => void;
  /**
   * When set, import asks every room member to approve instead of applying
   * immediately. Expansion holds are passed so coins commit only on approve.
   */
  onProposeImport?: (
    document: RoomDocument,
    expansionHold?: ExpansionImportHold,
  ) => void;
  /** True while waiting for peer approvals after proposing. */
  awaitingApprovals?: boolean;
  onCancelProposal?: () => void;
};

export function LayoutImportModal({
  visible,
  roomDocument,
  inventory,
  coins,
  buyerKey,
  onChangeDocument,
  onChangeInventory,
  onChangeCoins,
  onClose,
  onStatus,
  onProposeImport,
  awaitingApprovals = false,
  onCancelProposal,
}: Props) {
  const [draft, setDraft] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingRaw, setPendingRaw] = useState<unknown | null>(null);
  const [heldLeft, setHeldLeft] = useState(0);
  const [heldRight, setHeldRight] = useState(0);
  const [heldCoins, setHeldCoins] = useState(0);

  const draftExpansions = useMemo(
    () => ({ left: heldLeft, right: heldRight }),
    [heldLeft, heldRight],
  );

  const analysis = useMemo(() => {
    if (pendingRaw == null) return null;
    return analyzeLayoutImport(
      pendingRaw,
      inventory,
      roomDocument,
      draftExpansions,
    );
  }, [pendingRaw, inventory, roomDocument, draftExpansions]);

  function clearHolds() {
    setHeldLeft(0);
    setHeldRight(0);
    setHeldCoins(0);
  }

  function reset() {
    setDraft("");
    setParseError(null);
    setPendingRaw(null);
    clearHolds();
  }

  function refundLocalHolds() {
    if (heldCoins <= 0) return;
    onChangeCoins(coins + heldCoins);
  }

  function handleClose() {
    if (awaitingApprovals) {
      onCancelProposal?.();
    } else {
      refundLocalHolds();
    }
    reset();
    onClose();
  }

  function handleParse() {
    const parsed = parseLayoutJson(draft.trim());
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      setParseError((parsed as { error: string }).error);
      setPendingRaw(null);
      return;
    }
    // New check — release any prior expansion holds.
    if (heldCoins > 0) {
      onChangeCoins(coins + heldCoins);
      clearHolds();
    }
    const result = analyzeLayoutImport(parsed, inventory, roomDocument);
    if ("error" in result) {
      setParseError(result.error);
      setPendingRaw(null);
      return;
    }
    setParseError(null);
    setPendingRaw(parsed);
  }

  function pickFile() {
    const dom = (globalThis as { document?: { createElement: (tag: string) => HTMLInputElement } })
      .document;
    if (!dom?.createElement) {
      setParseError("File picker unavailable — paste JSON instead");
      return;
    }
    const input = dom.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        setDraft(text);
        const parsed = parseLayoutJson(text.trim());
        if (parsed && typeof parsed === "object" && "error" in parsed) {
          setParseError((parsed as { error: string }).error);
          setPendingRaw(null);
          return;
        }
        if (heldCoins > 0) {
          onChangeCoins(coins + heldCoins);
          clearHolds();
        }
        const result = analyzeLayoutImport(parsed, inventory, roomDocument);
        if ("error" in result) {
          setParseError(result.error);
          setPendingRaw(null);
          return;
        }
        setParseError(null);
        setPendingRaw(parsed);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExport() {
    const json = JSON.stringify(roomDocument, null, 2);
    setDraft(json);
    setParseError(null);
    setPendingRaw(null);
    if (heldCoins > 0) {
      onChangeCoins(coins + heldCoins);
      clearHolds();
    }

    if (Platform.OS === "web") {
      const dom = (
        globalThis as {
          document?: {
            createElement: (tag: string) => HTMLAnchorElement;
            body?: { appendChild: (n: Node) => void; removeChild: (n: Node) => void };
          };
          URL?: {
            createObjectURL: (b: Blob) => string;
            revokeObjectURL: (u: string) => void;
          };
        }
      );
      try {
        const blob = new Blob([json], { type: "application/json" });
        const url = dom.URL?.createObjectURL(blob);
        if (url && dom.document?.createElement) {
          const a = dom.document.createElement("a");
          a.href = url;
          a.download = "roomie-layout.json";
          dom.document.body?.appendChild(a);
          a.click();
          dom.document.body?.removeChild(a);
          dom.URL?.revokeObjectURL(url);
        }
      } catch {
        // Fall through — JSON is still in the text field.
      }
      const nav = (
        globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }
      ).navigator;
      void nav?.clipboard?.writeText?.(json).catch(() => undefined);
    }

    onStatus(
      Platform.OS === "web"
        ? "Exported room JSON (downloaded + copied)"
        : "Exported room JSON into the field — copy it from there",
    );
  }

  function buyNeed(need: LayoutNeed) {
    if (need.kind === "item") {
      if (coins < need.price) {
        onStatus(`Need ${need.price}c for ${need.name}`);
        return;
      }
      onChangeCoins(coins - need.price);
      onChangeInventory(refund(inventory, need.inventoryId, 1));
      onStatus(`Bought ${need.name} (−${need.price}c)`);
      return;
    }

    // Expansions are drafts: hold coins, do not mutate the live room.
    if (need.kind === "expandLeft") {
      if (coins < need.nextCost) {
        onStatus(`Need ${need.nextCost}c to hold left expansion`);
        return;
      }
      onChangeCoins(coins - need.nextCost);
      setHeldCoins((n) => n + need.nextCost);
      setHeldLeft((n) => n + 1);
      onStatus(`Left expansion on hold (−${need.nextCost}c)`);
      return;
    }

    if (need.kind === "expandRight") {
      if (coins < need.nextCost) {
        onStatus(`Need ${need.nextCost}c to hold right expansion`);
        return;
      }
      onChangeCoins(coins - need.nextCost);
      setHeldCoins((n) => n + need.nextCost);
      setHeldRight((n) => n + 1);
      onStatus(`Right expansion on hold (−${need.nextCost}c)`);
    }
  }

  function buildHold(): ExpansionImportHold | undefined {
    if (heldCoins <= 0 && heldLeft <= 0 && heldRight <= 0) return undefined;
    return {
      left: heldLeft,
      right: heldRight,
      cost: heldCoins,
      byUserKey: buyerKey,
    };
  }

  function handleApply() {
    if (!analysis || "error" in analysis) return;
    if (analysis.needs.length > 0) {
      onStatus("Buy missing items / hold expansions before importing");
      return;
    }
    const hold = buildHold();
    if (onProposeImport) {
      // Parent owns the hold until approve / decline / cancel.
      onProposeImport(analysis.document, hold);
      clearHolds();
      onStatus("Waiting for everyone in the room to approve…");
      return;
    }
    const result = applyLayoutImport(
      inventory,
      roomDocument,
      analysis.document,
      { expansionHold: hold },
    );
    if ("error" in result) {
      setParseError(result.error);
      return;
    }
    onChangeInventory(result.inventory);
    onChangeDocument(result.document);
    clearHolds();
    onStatus(
      hold && hold.cost > 0
        ? `Layout imported (−${hold.cost}c expansions)`
        : "Layout imported",
    );
    reset();
    onClose();
  }

  const needs =
    analysis && !("error" in analysis) ? analysis.needs : ([] as LayoutNeed[]);
  const canApply =
    analysis != null && !("error" in analysis) && analysis.needs.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Import / Export layout</Text>
          <Text style={styles.subtitle}>
            Export your current room as JSON, or paste/load a layout to import.
            Buy missing furniture now. Side expansions go on hold and only spend
            when the import is approved.
            {onProposeImport
              ? " Every member of this room must approve before it applies."
              : ""}
          </Text>

          {awaitingApprovals ? (
            <Text style={styles.waiting}>
              Waiting for the other member(s) to approve… You can cancel below.
              Held expansion coins refund if they decline.
            </Text>
          ) : null}

          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder='{"version":4,"furniture":[...],...}'
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.rowActions}>
            <Pressable style={styles.secondaryBtn} onPress={handleExport}>
              <Text style={styles.secondaryBtnText}>Export room</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={pickFile}>
              <Text style={styles.secondaryBtnText}>Choose file</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleParse}>
              <Text style={styles.primaryBtnText}>Check layout</Text>
            </Pressable>
          </View>

          {parseError ? <Text style={styles.error}>{parseError}</Text> : null}

          {analysis && !("error" in analysis) ? (
            <View style={styles.result}>
              <Text style={styles.resultTitle}>
                {needs.length === 0
                  ? "Ready to import"
                  : `Missing ${needs.length} requirement${needs.length === 1 ? "" : "s"}`}
              </Text>
              <Text style={styles.resultMeta}>
                {analysis.document.furniture.length} furniture ·{" "}
                {analysis.document.windows.length} windows · L
                {analysis.document.expansionsLeft}/R
                {analysis.document.expansionsRight} · {coins}c
                {heldCoins > 0
                  ? ` · ${heldCoins}c on hold (L+${heldLeft}/R+${heldRight})`
                  : ""}
              </Text>

              {needs.length > 0 ? (
                <ScrollView style={styles.needList}>
                  {needs.map((need) => (
                    <NeedRow
                      key={needKey(need)}
                      need={need}
                      coins={coins}
                      onBuy={() => buyNeed(need)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footer}>
            <Pressable style={styles.secondaryBtn} onPress={handleClose}>
              <Text style={styles.secondaryBtnText}>
                {awaitingApprovals ? "Cancel request" : "Cancel"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryBtn,
                (!canApply || awaitingApprovals) && styles.btnDisabled,
              ]}
              onPress={handleApply}
              disabled={!canApply || awaitingApprovals}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  (!canApply || awaitingApprovals) && styles.btnDisabledText,
                ]}
              >
                {onProposeImport ? "Request import" : "Import"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function needKey(need: LayoutNeed): string {
  if (need.kind === "item") return `item:${need.inventoryId}`;
  return need.kind;
}

function NeedRow({
  need,
  coins,
  onBuy,
}: {
  need: LayoutNeed;
  coins: number;
  onBuy: () => void;
}) {
  if (need.kind === "item") {
    const canBuy = coins >= need.price;
    return (
      <View style={styles.needRow}>
        <View style={styles.needInfo}>
          <Text style={styles.needName}>{need.name}</Text>
          <Text style={styles.needMeta}>
            Need {need.need} · have {need.have} · missing {need.missing}
          </Text>
        </View>
        <Pressable
          style={[styles.buyBtn, !canBuy && styles.btnDisabled]}
          onPress={onBuy}
          disabled={!canBuy}
        >
          <Text style={styles.buyBtnText}>Buy · {need.price}c</Text>
        </Pressable>
      </View>
    );
  }

  const label =
    need.kind === "expandLeft" ? "Expand left" : "Expand right";
  const canBuy = coins >= need.nextCost;
  return (
    <View style={styles.needRow}>
      <View style={styles.needInfo}>
        <Text style={styles.needName}>{label}</Text>
        <Text style={styles.needMeta}>
          Need {need.need} · own/held {need.have} · hold {need.missing} more
        </Text>
      </View>
      <Pressable
        style={[styles.buyBtn, !canBuy && styles.btnDisabled]}
        onPress={onBuy}
        disabled={!canBuy}
      >
        <Text style={styles.buyBtnText}>Hold · {need.nextCost}c</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    padding: space.lg,
    gap: space.sm,
    maxHeight: "92%",
  },
  title: {
    ...typography.brand,
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: space.xs,
  },
  input: {
    minHeight: 120,
    maxHeight: 180,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    padding: space.md,
    color: colors.ink,
    fontSize: 12,
    fontFamily: "monospace",
  },
  rowActions: {
    flexDirection: "row",
    gap: space.sm,
  },
  footer: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.xs,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnDisabledText: {
    color: colors.inkFaint,
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 13,
  },
  waiting: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: space.sm,
    overflow: "hidden",
  },
  result: {
    gap: space.xs,
    maxHeight: 280,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  needList: {
    maxHeight: 200,
  },
  needRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.sm,
    marginTop: space.xs,
  },
  needInfo: {
    flex: 1,
    gap: 2,
  },
  needName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  needMeta: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  buyBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  buyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
});
