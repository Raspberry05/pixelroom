import { SPRITE_CATALOG, type FurnitureSprite } from "./roomLayout";

/** One frame inside a sequence state (e.g. TV channel A1). */
export type FurnitureOverlayFrame = {
  id: string;
  label: string;
  /** Built-in piece sprite (legacy / fallback). */
  sprite?: FurnitureSprite;
  /** DevTools Overlay Frames library id (preferred — editable crop). */
  libraryId?: string;
};

/**
 * Visual mode for a furniture SKU — independent from chair rotations.
 * `base` = chassis only; `sequence` = animated overlay frames.
 */
export type FurnitureVisualState = {
  id: string;
  label: string;
  kind: "base" | "sequence";
  frames?: FurnitureOverlayFrame[];
  /** Milliseconds per frame when kind is sequence. */
  frameMs?: number;
};

/** Overlay rect in atlas pixels relative to the chassis crop top-left. */
export type FurnitureOverlayPlacement = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

/** Matches the atlas composite paste (screen into 16×16 TV chassis). */
export const DEFAULT_TV_OVERLAY: FurnitureOverlayPlacement = {
  offsetX: 3,
  offsetY: 4,
  width: 10,
  height: 6,
};

const TV_SCREEN_SPRITES: FurnitureSprite[] = [
  "tvScreen0",
  "tvScreen1",
  "tvScreen2",
  "tvScreen3",
  "tvScreen4",
  "tvScreen5",
  "tvScreen6",
  "tvScreen7",
];

export function isTvScreenSprite(sprite: FurnitureSprite): boolean {
  return TV_SCREEN_SPRITES.includes(sprite);
}

export function buildTvVisualStates(): FurnitureVisualState[] {
  const channel = (
    id: string,
    label: string,
    entries: Array<{
      sprite: FurnitureSprite;
      libraryId: string;
      frameLabel: string;
    }>,
  ): FurnitureVisualState => ({
    id,
    label,
    kind: "sequence",
    frameMs: 180,
    frames: entries.map((e) => ({
      id: `${id}_${e.frameLabel}`,
      label: e.frameLabel,
      sprite: e.sprite,
      libraryId: e.libraryId,
    })),
  });

  return [
    { id: "off", label: "Off", kind: "base" },
    channel("channelA", "Channel A", [
      { sprite: "tvScreen0", libraryId: "tv_screen_0", frameLabel: "A1" },
      { sprite: "tvScreen1", libraryId: "tv_screen_1", frameLabel: "A2" },
      { sprite: "tvScreen2", libraryId: "tv_screen_2", frameLabel: "A3" },
      { sprite: "tvScreen3", libraryId: "tv_screen_3", frameLabel: "A4" },
    ]),
    channel("channelB", "Channel B", [
      { sprite: "tvScreen4", libraryId: "tv_screen_4", frameLabel: "B1" },
      { sprite: "tvScreen5", libraryId: "tv_screen_5", frameLabel: "B2" },
      { sprite: "tvScreen6", libraryId: "tv_screen_6", frameLabel: "B3" },
      { sprite: "tvScreen7", libraryId: "tv_screen_7", frameLabel: "B4" },
    ]),
  ];
}

export function findVisualState(
  states: FurnitureVisualState[] | undefined,
  stateId: string | undefined,
): FurnitureVisualState | undefined {
  if (!states?.length) return undefined;
  if (stateId) {
    const hit = states.find((s) => s.id === stateId);
    if (hit) return hit;
  }
  return states.find((s) => s.kind === "sequence") ?? states[0];
}

/** Sprites you can pick as overlay animation frames (screens first). */
export function listOverlayFrameCandidates(): FurnitureSprite[] {
  const screens = SPRITE_CATALOG.filter((s) => s.overlayFrame).map((s) => s.id);
  const others = SPRITE_CATALOG.filter(
    (s) => !s.overlayFrame && s.tileBrush == null && s.paintable,
  ).map((s) => s.id);
  return [...screens, ...others];
}

/** Default overlay box centered on a chassis crop. */
export function defaultOverlayPlacement(
  chassisW: number,
  chassisH: number,
): FurnitureOverlayPlacement {
  const width = Math.max(1, Math.round(chassisW * 0.6));
  const height = Math.max(1, Math.round(chassisH * 0.4));
  return {
    offsetX: Math.max(0, Math.round((chassisW - width) / 2)),
    offsetY: Math.max(0, Math.round((chassisH - height) / 2)),
    width,
    height,
  };
}

/** Starter Off + one empty On sequence for any furniture. */
export function createBlankVisualStates(): FurnitureVisualState[] {
  return [
    { id: "off", label: "Off", kind: "base" },
    {
      id: "on",
      label: "On",
      kind: "sequence",
      frameMs: 180,
      frames: [],
    },
  ];
}

export function newSequenceState(
  label = "Sequence",
): FurnitureVisualState {
  const id = `seq_${Date.now().toString(36)}`;
  return {
    id,
    label,
    kind: "sequence",
    frameMs: 180,
    frames: [],
  };
}
