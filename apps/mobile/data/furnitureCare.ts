import type { FurnitureSprite } from "./roomLayout";

export type FurnitureCareState = {
  plantLastWateredAt: number;
  bedLastMadeAt: number;
  tvLastWatchedAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Freshly tended furniture — no warning indicators. */
export function createFurnitureCareState(
  nowMs: number = Date.now(),
): FurnitureCareState {
  return {
    plantLastWateredAt: nowMs,
    bedLastMadeAt: nowMs,
    tvLastWatchedAt: nowMs,
  };
}

/** Aged so plant/TV/bed all show needy indicators (Test Lab). */
export function createNeedyFurnitureCareState(
  nowMs: number = Date.now(),
): FurnitureCareState {
  const aged = nowMs - 4 * DAY_MS;
  return {
    plantLastWateredAt: aged,
    bedLastMadeAt: aged,
    tvLastWatchedAt: aged,
  };
}

/** Plant wilts after ~2 days without water. */
export function plantNeedsWater(
  state: FurnitureCareState,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - state.plantLastWateredAt >= 2 * DAY_MS;
}

/** Bed looks messy after ~1 day unmade. */
export function bedIsMessy(
  state: FurnitureCareState,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - state.bedLastMadeAt >= 1 * DAY_MS;
}

/** TV shows static after ~1 day without watching. */
export function tvHasStatic(
  state: FurnitureCareState,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - state.tvLastWatchedAt >= 1 * DAY_MS;
}

export type FurnitureCareIndicator = "dying" | "static" | "messy";

export function careIndicatorForSprite(
  sprite: FurnitureSprite,
  state: FurnitureCareState,
  nowMs: number = Date.now(),
): FurnitureCareIndicator | null {
  if (sprite === "plant" && plantNeedsWater(state, nowMs)) return "dying";
  if (sprite === "tv" && tvHasStatic(state, nowMs)) return "static";
  if (sprite === "bed" && bedIsMessy(state, nowMs)) return "messy";
  return null;
}
