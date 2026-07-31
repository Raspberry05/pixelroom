import { isCommandAction } from "./actions.js";
import type { ActionKind, ParsedCommand } from "./types.js";

const COMMAND_RE = /^\*([a-zA-Z]+)(?:\s+@?(.+))?$/;

/** Multi-word / alias phrases checked before the single-verb pattern. */
const PHRASE_COMMANDS: { re: RegExp; action: ActionKind }[] = [
  { re: /^\*make\s*bed\b/i, action: "makebed" },
  { re: /^\*makebed\b/i, action: "makebed" },
  { re: /^\*water(?:\s+plant)?\b/i, action: "water" },
  { re: /^\*watch(?:\s+tv)?\b/i, action: "watch" },
];

/**
 * Parse chat input into a room command.
 * Examples: `*hug`, `*hug alex`, `*kiss @Sam`, `*make bed`, `*water plant`, `*watch tv`
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  for (const phrase of PHRASE_COMMANDS) {
    if (phrase.re.test(trimmed)) {
      return {
        action: phrase.action,
        targetName: null,
        raw: trimmed,
      };
    }
  }

  const match = COMMAND_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const verb = match[1]?.toLowerCase();
  if (!verb || !isCommandAction(verb)) {
    return null;
  }

  const targetRaw = match[2]?.trim() ?? null;
  return {
    action: verb,
    targetName: targetRaw && targetRaw.length > 0 ? targetRaw : null,
    raw: trimmed,
  };
}

export function isCommandInput(input: string): boolean {
  return input.trim().startsWith("*");
}
