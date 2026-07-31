import type { ActionKind } from "./types.js";

/** Actions players can invoke with `*command` syntax. */
export const COMMAND_ACTIONS = [
  "cook",
  "clean",
  "hug",
  "kiss",
  "wave",
  "talk",
  "sit",
  "dance",
  "sing",
  "watch",
] as const satisfies readonly ActionKind[];

export type CommandAction = (typeof COMMAND_ACTIONS)[number];

const COMMAND_SET = new Set<string>(COMMAND_ACTIONS);

/** Social actions that need another character (no room hotspot). */
export const SOCIAL_ACTIONS = new Set<ActionKind>(["hug", "kiss", "wave", "talk"]);

/**
 * Actions that require a free room hotspot (seat / cook station / etc.).
 * Character walks to the spot; spot must be unoccupied.
 */
export const LOCATION_ACTIONS = new Set<ActionKind>(["sit", "cook", "clean"]);

/**
 * Prompt-only social flourishes — user-triggered, not auto-sim.
 */
export const PROMPT_ONLY_ACTIONS = new Set<ActionKind>(["hug", "kiss", "dance"]);

/**
 * Auto-sim may pick these (users can still prompt them too).
 */
export const AUTO_INTERACTIONS: ActionKind[] = ["wave", "talk", "sit", "sing"];

/**
 * Minimum time before the same actor can auto/command-repeat an action.
 * Sticky location actions also refuse while already in that state.
 */
export const ACTION_COOLDOWN_MS: Record<ActionKind, number> = {
  idle: 0,
  walk: 0,
  sleep: 0,
  sit: 48_000,
  cook: 42_000,
  clean: 42_000,
  wave: 16_000,
  talk: 12_000,
  sing: 36_000,
  dance: 28_000,
  watch: 24_000,
  hug: 22_000,
  kiss: 22_000,
};

export type HotspotKind = "sit" | "cook" | "clean";

export function hotspotKindForAction(action: ActionKind): HotspotKind | null {
  if (action === "sit") return "sit";
  if (action === "cook") return "cook";
  if (action === "clean") return "clean";
  return null;
}

export function isCommandAction(value: string): value is CommandAction {
  return COMMAND_SET.has(value);
}

export function isSocialAction(action: ActionKind): boolean {
  return SOCIAL_ACTIONS.has(action);
}

export function isLocationAction(action: ActionKind): boolean {
  return LOCATION_ACTIONS.has(action);
}

export function isPromptOnlyAction(action: ActionKind): boolean {
  return PROMPT_ONLY_ACTIONS.has(action);
}

/** True if this actor already auto-logged `action` within its cooldown window.
 *  User/command actions do not count toward auto cooldowns.
 */
export function recentlyPerformedAction(
  actionLog: ReadonlyArray<{
    at: number;
    actorId: string;
    action: ActionKind;
    source?: string;
  }>,
  actorId: string,
  action: ActionKind,
  now: number,
  cooldownMs: number = ACTION_COOLDOWN_MS[action],
): boolean {
  if (cooldownMs <= 0) return false;
  const minAt = now - cooldownMs;
  for (let i = actionLog.length - 1; i >= 0; i -= 1) {
    const entry = actionLog[i];
    if (!entry) continue;
    if (entry.at < minAt) break;
    if (entry.source && entry.source !== "auto") continue;
    if (entry.actorId === actorId && entry.action === action) {
      return true;
    }
  }
  return false;
}

/**
 * Whether an auto-sim actor should start `action` now.
 * Blocks repeats while already in that state and enforces auto-only cooldowns.
 */
export function canStartAction(
  member: { currentAction: ActionKind; characterId: string },
  action: ActionKind,
  actionLog: ReadonlyArray<{
    at: number;
    actorId: string;
    action: ActionKind;
    source?: string;
  }>,
  now: number,
): boolean {
  if (member.currentAction === action) {
    return false;
  }
  if (recentlyPerformedAction(actionLog, member.characterId, action, now)) {
    return false;
  }
  return true;
}
