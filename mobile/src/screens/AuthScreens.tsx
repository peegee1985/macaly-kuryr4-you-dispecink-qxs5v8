import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton, Card, Screen } from "../components/ui";
import { colors, radius, spacing } from "../theme";

type LoginStep = "credentials" | "verification";

export function LoginScreen() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCredentials = async () => {
    if (!email.trim() || !password) {
      setError("Zadejte e-mail a heslo.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("password", {
        flow: "signIn",
        email: email.trim().toLowerCase(),
        password,
      });
      if (result && !result.signingIn && !result.redirect) setStep("verification");
    } catch {
      setError("Přihlášení selhalo. Zkontrolujte e-mail a heslo.");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (code.length !== 6) {
      setError("Zadejte šestimístný ověřovací kód.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "email-verification",
        email: email.trim().toLowerCase(),
        code,
      });
    } catch {
      setError("Kód není platný nebo už vypršel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen withBottomTabs={false} contentStyle={styles.screen}>
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} />
          </View>
          <Text style={styles.brandName}>Kuryr4You</Text>
          <Text style={styles.brandSub}>ŘIDIČSKÁ APLIKACE</Text>
        </View>

        <Card style={styles.formCard}>
          {step === "credentials" ? (
            <>
              <Text style={styles.heading}>Přihlášení</Text>
              <Text style={styles.help}>Použijte stejný účet jako v řidičském portálu.</Text>

              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={19} color={colors.textMuted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ridic@email.cz"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Heslo</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoComplete="current-password"
                  style={styles.input}
                  onSubmitEditing={() => void submitCredentials()}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Přihlásit se" icon="arrow-forward" loading={loading} onPress={() => void submitCredentials()} />
            </>
          ) : (
            <>
              <View style={styles.verifyIcon}>
                <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
              </View>
              <Text style={styles.heading}>Ověření e-mailu</Text>
              <Text style={styles.help}>Šestimístný kód jsme poslali na {email}.</Text>
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.codeInput}
                onSubmitEditing={() => void submitCode()}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Potvrdit kód" loading={loading} onPress={() => void submitCode()} />
              <Pressable onPress={() => { setStep("credentials"); setError(null); }}>
                <Text style={styles.back}>← Zpět na přihlášení</Text>
              </Pressable>
            </>
          )}
        </Card>

        <Text style={styles.footer}>Bezpečné připojení ke kuryr4you.cz</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function AccountStateScreen({ state, onSignOut }: { state: "pending" | "blocked" | "wrong-role"; onSignOut: () => void }) {
  const copy = {
    pending: {
      icon: "time-outline" as const,
      title: "Účet čeká na schválení",
      message: "Dispečer musí nejdřív aktivovat váš řidičský účet.",
    },
    blocked: {
      icon: "ban-outline" as const,
      title: "Účet je zablokovaný",
      message: "Pro obnovení přístupu kontaktujte dispečink Kuryr4You.",
    },
    "wrong-role": {
      icon: "person-outline" as const,
      title: "Toto není účet řidiče",
      message: "Mobilní aplikace je v této verzi určená pouze řidičům.",
    },
  }[state];

  return (
    <Screen withBottomTabs={false} contentStyle={styles.stateScreen}>
      <View style={styles.stateIcon}>
        <Ionicons name={copy.icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{copy.title}</Text>
      <Text style={styles.stateMessage}>{copy.message}</Text>
      <AppButton title="Odhlásit se" variant="secondary" onPress={onSignOut} style={styles.stateButton} />
    </Screen>
  );
}

export function MissingConfigurationScreen() {
  return (
    <Screen withBottomTabs={false} contentStyle={styles.stateScreen}>
      <View style={styles.stateIcon}>
        <Ionicons name="settings-outline" size={34} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>Chybí adresa backendu</Text>
      <Text style={styles.stateMessage}>
        Nastavte v souboru .env proměnnou EXPO_PUBLIC_CONVEX_URL podle webového projektu.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  screen: { justifyContent: "center", paddingBottom: spacing.xl },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logoWrap: { width: 72, height: 72, borderRadius: 22, overflow: "hidden", marginBottom: spacing.md },
  logo: { width: 72, height: 72 },
  brandName: { color: colors.text, fontWeight: "900", fontSize: 25, letterSpacing: -0.5 },
  brandSub: { color: colors.primary, fontWeight: "800", fontSize: 10, letterSpacing: 2.2, marginTop: 3 },
  formCard: { gap: spacing.md },
  heading: { color: colors.text, fontWeight: "900", fontSize: 23 },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  label: { color: colors.text, fontSize: 12, fontWeight: "800", marginBottom: -4 },
  inputWrap: {
    height: 50,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: { color: colors.text, flex: 1, fontSize: 15 },
  error: { color: "#FCA5A5", backgroundColor: "rgba(239,68,68,0.12)", borderRadius: radius.sm, padding: 10, fontSize: 12 },
  verifyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  codeInput: {
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 58,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 10,
  },
  back: { color: colors.primary, textAlign: "center", fontWeight: "700", paddingVertical: spacing.sm },
  footer: { color: colors.textMuted, textAlign: "center", fontSize: 11, marginTop: spacing.lg },
  stateScreen: { alignItems: "center", justifyContent: "center", paddingBottom: spacing.xl },
  stateIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: spacing.lg },
  stateMessage: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: spacing.sm, maxWidth: 320 },
  stateButton: { minWidth: 180, marginTop: spacing.xl },
});
