/** Timing for ephemeral chat bubbles — scales with message length. */

const HOLD_BASE_MS = 2200;
const HOLD_PER_CHAR_MS = 55;
const HOLD_MIN_MS = 2400;
const HOLD_MAX_MS = 14000;

const FADE_BASE_MS = 1800;
const FADE_PER_CHAR_MS = 22;
const FADE_MIN_MS = 1800;
const FADE_MAX_MS = 7000;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type BubbleLifetime = {
  /** Full opacity until this age (solo bubble). */
  holdMs: number;
  /** Removed / fully transparent at this age. */
  lifeMs: number;
};

/** Longer text → longer hold + fade so it can be read. */
export function bubbleLifetime(text: string): BubbleLifetime {
  const len = text.trim().length;
  const holdMs = clamp(
    HOLD_BASE_MS + len * HOLD_PER_CHAR_MS,
    HOLD_MIN_MS,
    HOLD_MAX_MS,
  );
  const fadeMs = clamp(
    FADE_BASE_MS + len * FADE_PER_CHAR_MS,
    FADE_MIN_MS,
    FADE_MAX_MS,
  );
  return { holdMs, lifeMs: holdMs + fadeMs };
}

/** Solo bubble: hold at full opacity, then fade out. */
export function bubbleOpacity(ageMs: number, text: string): number {
  const { holdMs, lifeMs } = bubbleLifetime(text);
  if (ageMs <= holdMs) return 1;
  const fadeSpan = lifeMs - holdMs;
  if (fadeSpan <= 0) return 0;
  return Math.max(0, 1 - (ageMs - holdMs) / fadeSpan);
}

/**
 * Stack rules:
 * - Nearest chats (not the oldest): always full opacity
 * - Sole bubble: hold, then fade
 * - Oldest when 2+: always fading / disappearing
 */
export function stackBubbleOpacity(
  ageMs: number,
  text: string,
  opts: { isOldest: boolean; stackCount: number },
): number {
  if (opts.stackCount <= 1) {
    return bubbleOpacity(ageMs, text);
  }
  if (!opts.isOldest) {
    return 1;
  }
  const { lifeMs } = bubbleLifetime(text);
  if (lifeMs <= 0) return 0;
  return Math.max(0, 1 - ageMs / lifeMs);
}

/**
 * Newest-first list → drop expired oldest until the retiring bubble is still visible.
 * Non-oldest entries stay full opacity and are not culled by age.
 */
export function trimBubbleStack<T extends { at: number; text: string }>(
  newestFirst: T[],
  now: number,
  max: number,
): T[] {
  let list = newestFirst.slice(0, max);
  while (list.length > 0) {
    const oldest = list[list.length - 1];
    if (!oldest) break;
    const ageMs = Math.max(0, now - oldest.at);
    const opacity = stackBubbleOpacity(ageMs, oldest.text, {
      isOldest: true,
      stackCount: list.length,
    });
    if (opacity >= 0.03) break;
    list = list.slice(0, -1);
  }
  return list;
}
