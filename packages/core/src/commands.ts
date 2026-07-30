import { isCommandAction } from "./actions.js";
import type { ParsedCommand } from "./types.js";

const COMMAND_RE = /^\*([a-zA-Z]+)(?:\s+@?(.+))?$/;

/**
 * Parse chat input into a room command.
 * Examples: `*hug`, `*hug alex`, `*kiss @Sam`
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
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
