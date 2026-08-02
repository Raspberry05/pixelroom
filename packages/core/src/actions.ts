import type { ActionKind } from "./types.js";

/** Actions players can invoke with `*command` syntax. */
export const COMMAND_ACTIONS = [
  "cook",
  "fry",
  "clean",
  "hug",
  "kiss",
  "wave",
  "talk",
  "sit",
  "dance",
  "sing",
  "watch",
  "water",
  "makebed",
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
  fry: 36_000,
  clean: 42_000,
  wave: 16_000,
  talk: 12_000,
  sing: 36_000,
  dance: 28_000,
  watch: 24_000,
  water: 28_000,
  makebed: 28_000,
  hug: 22_000,
  kiss: 22_000,
};

/**
 * How long auto-sim must leave a character alone after they enter this action.
 * Prevents sit→talk→sing thrashing every tick.
 */
export const ACTION_HOLD_MS: Record<ActionKind, number> = {
  idle: 0,
  walk: 0,
  sleep: 90_000,
  sit: 30_000,
  cook: 34_000,
  fry: 30_000,
  clean: 30_000,
  wave: 7_000,
  talk: 12_000,
  sing: 24_000,
  dance: 20_000,
  watch: 20_000,
  water: 20_000,
  makebed: 20_000,
  hug: 12_000,
  kiss: 12_000,
};

/** After a player *command, block all auto for that character. */
export const PLAYER_COMMAND_HOLD_MS = 35_000;

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

type ActionLogSlice = ReadonlyArray<{
  at: number;
  actorId: string;
  action: ActionKind;
  source?: string;
}>;

/** True if this actor already auto-logged `action` within its cooldown window.
 *  User/command actions do not count toward auto cooldowns.
 */
export function recentlyPerformedAction(
  actionLog: ActionLogSlice,
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

/** True if this actor recently ran a player *command (must stay obedient). */
export function recentlyPlayerCommanded(
  actionLog: ActionLogSlice,
  actorId: string,
  now: number,
  holdMs: number = PLAYER_COMMAND_HOLD_MS,
): boolean {
  if (holdMs <= 0) return false;
  const minAt = now - holdMs;
  for (let i = actionLog.length - 1; i >= 0; i -= 1) {
    const entry = actionLog[i];
    if (!entry) continue;
    if (entry.at < minAt) break;
    if (String(entry.actorId) !== String(actorId)) continue;
    if (entry.source === "command") return true;
  }
  return false;
}

/**
 * True while the character should keep doing `currentAction`
 * (auto must not yank them into something else yet).
 */
export function isActionHeld(
  member: {
    characterId: string;
    currentAction: ActionKind;
    lastActiveAt: number;
  },
  actionLog: ActionLogSlice,
  now: number,
): boolean {
  const action = member.currentAction;
  const holdMs = ACTION_HOLD_MS[action] ?? 0;
  if (holdMs <= 0) return false;

  for (let i = actionLog.length - 1; i >= 0; i -= 1) {
    const entry = actionLog[i];
    if (!entry) continue;
    if (String(entry.actorId) !== String(member.characterId)) continue;
    if (entry.action === action) {
      return now - entry.at < holdMs;
    }
  }
  return now - member.lastActiveAt < holdMs;
}

/**
 * Whether an auto-sim actor should start `action` now.
 * Blocks repeats while already in that state, enforces auto-only cooldowns,
 * respects action holds, and yields to recent player commands.
 */
export function canStartAction(
  member: {
    currentAction: ActionKind;
    characterId: string;
    lastActiveAt?: number;
  },
  action: ActionKind,
  actionLog: ActionLogSlice,
  now: number,
): boolean {
  if (member.currentAction === action) {
    return false;
  }
  if (recentlyPlayerCommanded(actionLog, member.characterId, now)) {
    return false;
  }
  if (
    isActionHeld(
      {
        characterId: member.characterId,
        currentAction: member.currentAction,
        lastActiveAt: member.lastActiveAt ?? now,
      },
      actionLog,
      now,
    )
  ) {
    return false;
  }
  if (recentlyPerformedAction(actionLog, member.characterId, action, now)) {
    return false;
  }
  return true;
}
