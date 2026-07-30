import { createId } from "./id.js";
import {
  asAccountId,
  asCharacterId,
  type AccountId,
  type Appearance,
  type Character,
} from "./types.js";

export const DEFAULT_APPEARANCE: Appearance = {
  hair: "default",
  outfit: "starter",
  skin: "default",
  accessory: null,
};

export type CreateCharacterInput = {
  accountId: AccountId | string;
  displayName: string;
  appearance?: Partial<Appearance>;
  now?: number;
};

export function createCharacter(input: CreateCharacterInput): Character {
  const name = input.displayName.trim();
  if (name.length < 1 || name.length > 24) {
    throw new Error("displayName must be 1–24 characters");
  }

  const now = input.now ?? Date.now();
  return {
    id: asCharacterId(createId("char")),
    accountId: asAccountId(String(input.accountId)),
    displayName: name,
    appearance: {
      ...DEFAULT_APPEARANCE,
      ...input.appearance,
      accessory: input.appearance?.accessory ?? DEFAULT_APPEARANCE.accessory,
    },
    createdAt: now,
  };
}
