import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { asCharacterId, type Appearance, type RoomMemberState } from "@pixelroom/core";
import { SpriteFrame } from "./SpriteFrame";
import { COZY_SHEET, SHEET_SIZE, sheetDirRow, sheetSourceForId } from "../data/sprites";

type Props = {
  appearance: Appearance;
  member: RoomMemberState;
  /** Display size in px (nearest-neighbor scaled from native frame). */
  size: number;
};

function cozyLayerRows(appearance: Appearance): number[] {
  const rows: number[] = [COZY_SHEET.rows.body];
  if (appearance.hair !== "bald" && appearance.hair !== "none") {
    rows.push(COZY_SHEET.rows.hair);
  }
  if (appearance.outfit !== "none") {
    rows.push(COZY_SHEET.rows.shirt);
  }
  if (appearance.pants === "purple") {
    rows.push(COZY_SHEET.rows.pantsPurple);
  } else if (appearance.pants !== "none") {
    rows.push(COZY_SHEET.rows.pantsBlue);
  }
  rows.push(COZY_SHEET.rows.shoes);
  return rows;
}

function walkFrame(action: string, presence: string, tick: number): number {
  if (presence === "sleeping" || action === "sleep") return 0;
  if (action === "walk" || action === "dance") return tick % COZY_SHEET.cols;
  return 0;
}

export function AvatarSprite({ appearance, member, size }: Props) {
  const [tick, setTick] = useState(0);
  const moving =
    member.currentAction === "walk" ||
    member.currentAction === "dance" ||
    member.currentAction === "sing";

  useEffect(() => {
    if (!moving) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [moving]);

  const frame = walkFrame(member.currentAction, member.presence, tick);
  const facing = member.facing;
  const kit = appearance.kit === "sheet" ? "sheet" : "cozy";

  if (kit === "sheet") {
    const scale = Math.max(2, Math.round(size / SHEET_SIZE.frameH));
    const row = sheetDirRow(facing);
    const col = moving ? frame % SHEET_SIZE.cols : 0;
    return (
      <View
        style={[
          styles.box,
          {
            width: SHEET_SIZE.frameW * scale,
            height: SHEET_SIZE.frameH * scale,
          },
        ]}
      >
        <SpriteFrame
          source={sheetSourceForId(appearance.sheetId || "50")}
          sheetWidth={SHEET_SIZE.width}
          sheetHeight={SHEET_SIZE.height}
          rect={{
            x: col * SHEET_SIZE.frameW,
            y: row * SHEET_SIZE.frameH,
            w: SHEET_SIZE.frameW,
            h: SHEET_SIZE.frameH,
          }}
          scale={scale}
        />
      </View>
    );
  }

  const scale = Math.max(2, Math.round(size / COZY_SHEET.frame));
  const faceOffset = facing === "left" ? 1 : 0;
  const layers = cozyLayerRows(appearance);
  const px = COZY_SHEET.frame * scale;

  return (
    <View style={[styles.box, { width: px, height: px }]}>
      {layers.map((baseRow) => (
        <View key={baseRow} style={styles.layer}>
          <SpriteFrame
            source={COZY_SHEET.source}
            sheetWidth={COZY_SHEET.width}
            sheetHeight={COZY_SHEET.height}
            rect={{
              x: frame * COZY_SHEET.frame,
              y: (baseRow + faceOffset) * COZY_SHEET.frame,
              w: COZY_SHEET.frame,
              h: COZY_SHEET.frame,
            }}
            scale={scale}
          />
        </View>
      ))}
    </View>
  );
}

/** Static preview for You / profile (idle, facing right). */
export function AvatarPreview({
  appearance,
  size = 96,
}: {
  appearance: Appearance;
  size?: number;
}) {
  const idleMember: RoomMemberState = {
    characterId: asCharacterId("preview"),
    presence: "active",
    position: { x: 0, y: 0 },
    facing: "right",
    currentAction: "idle",
    actionTargetId: null,
    occupiedSpotId: null,
    lastActiveAt: 0,
  };
  return <AvatarSprite appearance={appearance} member={idleMember} size={Math.max(64, Math.round(size / 32) * 32)} />;
}

const styles = StyleSheet.create({
  box: {
    position: "relative",
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
