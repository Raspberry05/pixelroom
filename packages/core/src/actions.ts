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
] as const satisfies readonly ActionKind[];

export type CommandAction = (typeof COMMAND_ACTIONS)[number];

const COMMAND_SET = new Set<string>(COMMAND_ACTIONS);

/** Actions that require another character as target. */
export const SOCIAL_ACTIONS = new Set<ActionKind>(["hug", "kiss", "wave", "talk"]);

/** Actions the simulator may pick automatically between active members. */
export const AUTO_INTERACTIONS: ActionKind[] = ["wave", "talk", "sit", "dance"];

export function isCommandAction(value: string): value is CommandAction {
  return COMMAND_SET.has(value);
}

export function isSocialAction(action: ActionKind): boolean {
  return SOCIAL_ACTIONS.has(action);
}
