import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AvatarPreview } from "../components/AvatarSprite";
import {
  DEMO_OTP_FALLBACK,
  formatPhoneDisplay,
  issueDemoOtp,
  otpMatches,
  userKeyFromPhone,
  type OnboardingProfile,
  type PendingOtp,
} from "../data/onboarding";
import { DEMO_USERS, type DemoUserKey } from "../data/seed";
import { colors, radii, space, typography } from "../theme";

type Step = "welcome" | "phone" | "otp" | "profile";

type Props = {
  onComplete: (profile: OnboardingProfile) => void;
};

const DEMO_HINTS: { key: DemoUserKey; label: string; phone: string }[] = [
  { key: "alice", label: "Alice", phone: "+1 555 0101" },
  { key: "bob", label: "Bob", phone: "+1 555 0102" },
  { key: "carol", label: "Carol", phone: "+1 555 0103" },
];

export function IntroWizardScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [country, setCountry] = useState("US");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const digits = phone.replace(/\D/g, "");
  const phoneReady = digits.length >= 10;
  const mappedKey = useMemo(() => userKeyFromPhone(phone), [phone]);
  const previewUser = DEMO_USERS[mappedKey];

  async function sendCode() {
    if (!phoneReady) {
      setError("Enter a valid phone number.");
      return;
    }
    setError(null);
    setSending(true);
    // Simulated SMS latency — no carrier in the demo.
    await new Promise((r) => setTimeout(r, 450));
    const code = issueDemoOtp();
    setPending({
      phone: formatPhoneDisplay(digits) || phone.trim(),
      code,
      sentAt: Date.now(),
    });
    setOtp("");
    setSending(false);
    setStep("otp");
  }

  function verifyCode() {
    if (!otpMatches(otp, pending)) {
      setError("That code doesn’t match. Try again.");
      return;
    }
    setError(null);
    const seedName = DEMO_USERS[mappedKey].character.displayName;
    setDisplayName((prev) => prev.trim() || seedName);
    setStep("profile");
  }

  function finish() {
    const name = displayName.trim();
    if (!name) {
      setError("Pick a display name.");
      return;
    }
    onComplete({
      phone: pending?.phone ?? formatPhoneDisplay(digits) ?? phone.trim(),
      country: country.trim() || "US",
      displayName: name,
      userKey: mappedKey,
      completedAt: Date.now(),
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <View style={styles.shell}>
        {step === "welcome" ? (
          <WelcomeStep onContinue={() => setStep("phone")} />
        ) : null}

        {step === "phone" ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Create your account</Text>
            <Text style={styles.headline}>What’s your number?</Text>
            <Text style={styles.sub}>
              We’ll text a one-time code. No password — your phone is your key.
            </Text>

            <View style={styles.row}>
              <View style={[styles.field, styles.countryField]}>
                <Text style={styles.fieldLabel}>Country</Text>
                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="characters"
                  maxLength={2}
                  style={styles.input}
                  accessibilityLabel="Country code"
                />
              </View>
              <View style={[styles.field, styles.flex]}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setError(null);
                  }}
                  keyboardType="phone-pad"
                  placeholder="+1 555 0101"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.input}
                  accessibilityLabel="Phone number"
                />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, !phoneReady && styles.primaryDisabled]}
              onPress={sendCode}
              disabled={!phoneReady || sending}
              accessibilityRole="button"
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Text me a code</Text>
              )}
            </Pressable>

            <Text style={styles.hint}>Demo peers (same numbers as seed contacts)</Text>
            <View style={styles.chipRow}>
              {DEMO_HINTS.map((d) => (
                <Pressable
                  key={d.key}
                  style={styles.chip}
                  onPress={() => {
                    setPhone(d.phone);
                    setError(null);
                  }}
                >
                  <Text style={styles.chipText}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === "otp" ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Verify</Text>
            <Text style={styles.headline}>Enter the code</Text>
            <Text style={styles.sub}>
              Sent to {pending?.phone ?? formatPhoneDisplay(digits)}. For this
              demo, use the code below — or {DEMO_OTP_FALLBACK}.
            </Text>

            {pending ? (
              <View style={styles.demoCodeBox}>
                <Text style={styles.demoCodeLabel}>Demo SMS code</Text>
                <Text style={styles.demoCode}>{pending.code}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>6-digit code</Text>
              <TextInput
                value={otp}
                onChangeText={(v) => {
                  setOtp(v.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor={colors.inkFaint}
                style={[styles.input, styles.otpInput]}
                accessibilityLabel="Verification code"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, otp.length !== 6 && styles.primaryDisabled]}
              onPress={verifyCode}
              disabled={otp.length !== 6}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Verify</Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setStep("phone");
                setError(null);
              }}
            >
              <Text style={styles.linkText}>Change number</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "profile" ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Almost there</Text>
            <Text style={styles.headline}>How should we call you?</Text>
            <Text style={styles.sub}>
              This name shows in rooms and calls. You can change it later in You.
            </Text>

            <View style={styles.avatarWrap}>
              <AvatarPreview appearance={previewUser.character.appearance} size={96} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={(v) => {
                  setDisplayName(v);
                  setError(null);
                }}
                placeholder="Your name"
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                autoFocus
                accessibilityLabel="Display name"
              />
            </View>

            <Text style={styles.meta}>
              Signed in as {formatPhoneDisplay(digits) || phone} · sync id{" "}
              {mappedKey}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primary, !displayName.trim() && styles.primaryDisabled]}
              onPress={finish}
              disabled={!displayName.trim()}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Enter Pixelroom</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.welcome}>
      <Text style={styles.brand}>Pixelroom</Text>
      <Text style={styles.welcomeLine}>
        Encrypted rooms and voice with the people you already know.
      </Text>
      <Pressable
        style={styles.primary}
        onPress={onContinue}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Continue with phone</Text>
      </Pressable>
      <Text style={styles.welcomeFoot}>
        End-to-end chat · peer-to-peer calling on the web
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    overflow: "hidden",
  },
  glowA: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(61, 143, 108, 0.22)",
    top: -120,
    right: -80,
  },
  glowB: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(47, 111, 85, 0.14)",
    bottom: -100,
    left: -60,
  },
  shell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.xxl,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  welcome: {
    gap: space.lg,
  },
  brand: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1.6,
    color: colors.ink,
  },
  welcomeLine: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.inkMuted,
    maxWidth: 320,
  },
  welcomeFoot: {
    ...typography.caption,
    color: colors.inkFaint,
    textTransform: "none",
    letterSpacing: 0,
  },
  card: {
    gap: space.md,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    textTransform: "uppercase",
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.ink,
  },
  sub: {
    ...typography.body,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  flex: { flex: 1 },
  field: {
    gap: space.xs,
    marginBottom: space.sm,
  },
  countryField: {
    width: 72,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.inkFaint,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: colors.ink,
    fontSize: 16,
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  primary: {
    marginTop: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: space.md + 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  linkBtn: {
    alignItems: "center",
    paddingVertical: space.sm,
  },
  linkText: {
    color: colors.accent,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  hint: {
    ...typography.caption,
    color: colors.inkFaint,
    textTransform: "none",
    letterSpacing: 0,
    marginTop: space.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
  },
  chipText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 13,
  },
  demoCodeBox: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: space.lg,
    alignItems: "center",
    gap: space.xs,
  },
  demoCodeLabel: {
    ...typography.caption,
    color: colors.accent,
  },
  demoCode: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 6,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  avatarWrap: {
    alignItems: "center",
    paddingVertical: space.md,
  },
  meta: {
    ...typography.caption,
    color: colors.inkFaint,
    textTransform: "none",
    letterSpacing: 0,
  },
});
