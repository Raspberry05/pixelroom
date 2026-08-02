import { Platform } from "react-native";
import { DEMO_USERS, isDemoUserKey, type DemoUserKey } from "./seed";

export const ONBOARDING_STORAGE_KEY = "pixelroom.onboarding.v1";

/** Demo SMS codes — no carrier; any of these work, or the one issued for the session. */
export const DEMO_OTP_FALLBACK = "424242";

export type OnboardingProfile = {
  phone: string;
  country: string;
  displayName: string;
  userKey: DemoUserKey;
  completedAt: number;
};

export type PendingOtp = {
  phone: string;
  code: string;
  sentAt: number;
};

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** True when the number is long enough, or matches a demo seed phone (short 555-01xx). */
export function isPhoneReady(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  if (digits.length >= 10) return true;
  const compact = digits.replace(/^1(?=\d{7,}$)/, "");
  if (compact.length < 7) return false;
  return (Object.keys(DEMO_USERS) as DemoUserKey[]).some((key) => {
    const seed = normalizePhoneDigits(DEMO_USERS[key].phone).replace(
      /^1(?=\d{7,}$)/,
      "",
    );
    return compact === seed || digits.endsWith(seed);
  });
}

export function formatPhoneDisplay(digits: string): string {
  const d = normalizePhoneDigits(digits);
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  if (d.length > 0) return `+${d}`;
  return "";
}

/** Match demo seed phones, else stable slot from last digits. */
export function userKeyFromPhone(phone: string): DemoUserKey {
  const digits = normalizePhoneDigits(phone);
  const compact = digits.replace(/^1(?=\d{10}$)/, "");

  for (const key of Object.keys(DEMO_USERS) as DemoUserKey[]) {
    const seedDigits = normalizePhoneDigits(DEMO_USERS[key].phone).replace(
      /^1(?=\d{10}$)/,
      "",
    );
    if (compact === seedDigits || digits.endsWith(seedDigits)) {
      return key;
    }
  }

  let sum = 0;
  for (const ch of compact || digits || "0") {
    sum += Number(ch) || 0;
  }
  const slots: DemoUserKey[] = ["alice", "bob", "carol", "dave"];
  return slots[sum % 4]!;
}

export function issueDemoOtp(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export function otpMatches(input: string, pending: PendingOtp | null): boolean {
  const code = input.replace(/\D/g, "");
  if (code.length !== 6) return false;
  if (code === DEMO_OTP_FALLBACK) return true;
  if (pending && code === pending.code) return true;
  return false;
}

export function loadOnboardingProfile(): OnboardingProfile | null {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as OnboardingProfile;
      if (
        !parsed ||
        typeof parsed.phone !== "string" ||
        typeof parsed.displayName !== "string" ||
        !isDemoUserKey(parsed.userKey)
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }
}

export function clearOnboardingProfile(): void {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function setUserQueryParam(userKey: DemoUserKey): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("user", userKey);
  window.history.replaceState({}, "", url.toString());
}

/** Remove `?user=` so the next visit can show the sign-in wizard. */
export function clearUserQueryParam(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("user");
  window.history.replaceState({}, "", url.toString());
}
