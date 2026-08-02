import { Platform } from "react-native";
import type { Appearance } from "@pixelroom/core";
import { DEMO_USERS, isDemoUserKey, type DemoUserKey } from "./seed";
import { migrateAppearanceHats } from "./wardrobe";

export const APPEARANCE_STORAGE_KEY = "pixelroom.appearance.v1";

type AppearanceStore = Partial<Record<DemoUserKey, Appearance>>;

function canUseStorage(): boolean {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
}

function isAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    (a.kit === "cozy" || a.kit === "sheet") &&
    typeof a.sheetId === "string" &&
    typeof a.hair === "string" &&
    typeof a.outfit === "string" &&
    typeof a.pants === "string" &&
    typeof a.skin === "string" &&
    (a.accessory === null || typeof a.accessory === "string")
  );
}

function readStore(): AppearanceStore {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: AppearanceStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isDemoUserKey(key) || !isAppearance(value)) continue;
      out[key] = migrateAppearanceHats(value);
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: AppearanceStore): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

/** Saved look for this demo user, or null if never customized. */
export function loadAppearance(userKey: DemoUserKey): Appearance | null {
  return readStore()[userKey] ?? null;
}

/** Persist equipped appearance for this demo user (multi-tab safe per key). */
export function saveAppearance(
  userKey: DemoUserKey,
  appearance: Appearance,
): void {
  const store = readStore();
  store[userKey] = migrateAppearanceHats(appearance);
  writeStore(store);
}

/** Live look: saved customization, else seed default. */
export function appearanceForUser(userKey: DemoUserKey): Appearance {
  return migrateAppearanceHats(
    loadAppearance(userKey) ?? DEMO_USERS[userKey].character.appearance,
  );
}

/**
 * Hallway row faces — peers only (never self).
 * Uses persisted looks when peers have customized in this browser.
 */
export function appearancesForConversation(
  memberKeys: DemoUserKey[],
  kind: "dm" | "party",
  selfKey: DemoUserKey,
): Appearance[] {
  const peers = memberKeys.filter((k) => k !== selfKey);
  const keys = kind === "dm" ? peers.slice(0, 1) : peers.slice(0, 3);
  return keys.map((k) => appearanceForUser(k));
}
