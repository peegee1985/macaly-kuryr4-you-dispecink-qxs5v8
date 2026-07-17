import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, Screen } from "../components/ui";
import { colors, radius, spacing } from "../theme";

type AccessStep =
  | { type: "login" }
  | { type: "verify"; email: string; password: string }
  | { type: "forgot" }
  | { type: "reset"; email: string };

export function AccessScreen() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<AccessStep>({ type: "login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const begin = () => {
    setLoading(true);
    setError(null);
    setInfo(null);
  };

  const submitLogin = async () => {
    if (!email.trim() || !password) {
      setError("Zadejte e-mail a heslo.");
      return;
    }
    begin();
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await signIn("password", { flow: "signIn", email: normalizedEmail, password });
      if (result && !result.signingIn && !result.redirect) {
        setStep({ type: "verify", email: normalizedEmail, password });
        setCode("");
      }
    } catch (err) {
      const message = String((err as { message?: string }).message ?? "").toLowerCase();
      setError(message.includes("invalid") || message.includes("password") || message.includes("credentials")
        ? "Nesprávný e-mail nebo heslo."
        : "Přihlášení selhalo. Zkontrolujte připojení a zkuste to znovu.");
    } finally {
      setLoading(false);
    }
  };

  const submitVerification = async () => {
    if (step.type !== "verify" || code.length !== 6) {
      setError("Zadejte šestimístný ověřovací kód.");
      return;
    }
    begin();
    try {
      await signIn("password", { flow: "email-verification", email: step.email, code });
    } catch {
      setError("Kód není platný nebo už vypršel.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (step.type !== "verify") return;
    begin();
    try {
      await signIn("password", { flow: "signIn", email: step.email, password: step.password });
      setInfo("Nový kód byl odeslán na váš e-mail.");
    } catch {
      setError("Nový kód se nepodařilo odeslat.");
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    if (!email.trim()) {
      setError("Zadejte svůj e-mail.");
      return;
    }
    begin();
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signIn("password", { flow: "reset", email: normalizedEmail });
      setStep({ type: "reset", email: normalizedEmail });
      setCode("");
      setNewPassword("");
      setInfo("Ověřovací kód byl odeslán.");
    } catch {
      setError("Kód se nepodařilo odeslat. Zkontrolujte e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (step.type !== "reset" || code.length !== 6 || newPassword.length < 8) {
      setError("Zadejte platný kód a nové heslo o délce alespoň 8 znaků.");
      return;
    }
    begin();
    try {
      await signIn("password", { flow: "reset-verification", email: step.email, code, newPassword });
      setPassword(newPassword);
      setStep({ type: "login" });
      setInfo("Heslo bylo změněno. Nyní se přihlaste.");
    } catch {
      setError("Kód není platný nebo už vypršel.");
    } finally {
      setLoading(false);
    }
  };

  const changeStep = (next: AccessStep) => {
    setStep(next);
    setError(null);
    setInfo(null);
    setCode("");
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={styles.screen} withBottomTabs={false}>
        <View style={styles.brand}>
          <View style={styles.logoWrap}><Image source={require("../../assets/icon.png")} style={styles.logo} /></View>
          <Text style={styles.brandName}>Kuryr4You</Text>
          <Text style={styles.brandSub}>DISPEČERSKÁ APLIKACE</Text>
        </View>

        <Card style={styles.formCard}>
          {step.type === "login" ? (
            <>
              <Text style={styles.heading}>Přihlášení dispečera</Text>
              <Text style={styles.help}>Použijte stejný účet jako ve webovém řídicím centru.</Text>
              <FormField label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="dispecer@kuryr4you.cz" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              <FormField label="Heslo" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submitLogin()} />
              {info ? <Text style={styles.info}>{info}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Přihlásit se" icon="arrow-forward" loading={loading} onPress={() => void submitLogin()} />
              <Pressable accessibilityRole="button" onPress={() => changeStep({ type: "forgot" })}><Text style={styles.link}>Zapomenuté heslo?</Text></Pressable>
            </>
          ) : null}

          {step.type === "verify" ? (
            <>
              <View style={styles.verifyIcon}><Ionicons name="shield-checkmark" size={28} color={colors.primary} /></View>
              <Text style={styles.heading}>Ověření e-mailu</Text>
              <Text style={styles.help}>Šestimístný kód jsme poslali na {step.email}.</Text>
              <FormField label="Ověřovací kód" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" keyboardType="number-pad" maxLength={6} onSubmitEditing={() => void submitVerification()} />
              {info ? <Text style={styles.info}>{info}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Potvrdit kód" loading={loading} onPress={() => void submitVerification()} />
              <AppButton title="Poslat nový kód" variant="ghost" disabled={loading} onPress={() => void resendVerification()} />
              <Pressable accessibilityRole="button" onPress={() => changeStep({ type: "login" })}><Text style={styles.back}>← Zpět</Text></Pressable>
            </>
          ) : null}

          {step.type === "forgot" ? (
            <>
              <Text style={styles.heading}>Obnova hesla</Text>
              <Text style={styles.help}>Na váš e-mail pošleme ověřovací kód.</Text>
              <FormField label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="dispecer@kuryr4you.cz" keyboardType="email-address" autoCapitalize="none" onSubmitEditing={() => void requestReset()} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Odeslat kód" loading={loading} onPress={() => void requestReset()} />
              <Pressable accessibilityRole="button" onPress={() => changeStep({ type: "login" })}><Text style={styles.back}>← Zpět na přihlášení</Text></Pressable>
            </>
          ) : null}

          {step.type === "reset" ? (
            <>
              <Text style={styles.heading}>Nastavit nové heslo</Text>
              <Text style={styles.help}>Kód byl odeslán na {step.email}.</Text>
              <FormField label="Ověřovací kód" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" keyboardType="number-pad" maxLength={6} />
              <FormField label="Nové heslo" icon="lock-closed-outline" value={newPassword} onChangeText={setNewPassword} placeholder="Minimálně 8 znaků" secureTextEntry onSubmitEditing={() => void submitReset()} />
              {info ? <Text style={styles.info}>{info}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title="Změnit heslo" loading={loading} onPress={() => void submitReset()} />
              <Pressable accessibilityRole="button" onPress={() => changeStep({ type: "login" })}><Text style={styles.back}>← Zrušit</Text></Pressable>
            </>
          ) : null}
        </Card>
        <Text style={styles.footer}>Bezpečné připojení ke kuryr4you.cz</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function AccountStateScreen({ state, onSignOut }: { state: "inactive" | "wrong-role"; onSignOut: () => void }) {
  const copy = state === "inactive"
    ? { icon: "ban-outline" as const, title: "Účet není aktivní", message: "Přístup k dispečinku musí být aktivní. Kontaktujte správce Kuryr4You." }
    : { icon: "shield-outline" as const, title: "Toto není účet dispečera", message: "Přihlaste se účtem s rolí dispečer. Aplikace řidiče a zákazníka jsou samostatné." };
  return (
    <Screen contentStyle={styles.stateScreen} withBottomTabs={false}>
      <View style={styles.stateIcon}><Ionicons name={copy.icon} size={34} color={colors.primary} /></View>
      <Text style={styles.stateTitle}>{copy.title}</Text>
      <Text style={styles.stateMessage}>{copy.message}</Text>
      <AppButton title="Odhlásit se" variant="secondary" onPress={onSignOut} style={styles.stateButton} />
    </Screen>
  );
}

export function MissingConfigurationScreen() {
  return (
    <Screen contentStyle={styles.stateScreen} withBottomTabs={false}>
      <View style={styles.stateIcon}><Ionicons name="settings-outline" size={34} color={colors.primary} /></View>
      <Text style={styles.stateTitle}>Chybí adresa backendu</Text>
      <Text style={styles.stateMessage}>Nastavte EXPO_PUBLIC_CONVEX_URL podle webového projektu.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  screen: { justifyContent: "center", paddingTop: spacing.xl },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logoWrap: { width: 72, height: 72, borderRadius: 22, overflow: "hidden", marginBottom: spacing.md },
  logo: { width: 72, height: 72 },
  brandName: { color: colors.text, fontWeight: "900", fontSize: 25, letterSpacing: -0.5 },
  brandSub: { color: colors.primary, fontWeight: "800", fontSize: 10, letterSpacing: 2.1, marginTop: 3 },
  formCard: { gap: spacing.md },
  heading: { color: colors.text, fontWeight: "900", fontSize: 23 },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.xs },
  error: { color: "#FCA5A5", backgroundColor: "rgba(239,68,68,0.12)", borderRadius: radius.sm, padding: 10, fontSize: 12 },
  info: { color: "#86EFAC", backgroundColor: "rgba(34,197,94,0.12)", borderRadius: radius.sm, padding: 10, fontSize: 12 },
  link: { color: colors.primary, textAlign: "center", fontWeight: "700", paddingVertical: spacing.sm },
  back: { color: colors.primary, textAlign: "center", fontWeight: "700", paddingVertical: spacing.sm },
  verifyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  footer: { color: colors.textMuted, textAlign: "center", fontSize: 11, marginTop: spacing.lg },
  stateScreen: { alignItems: "center", justifyContent: "center", paddingBottom: spacing.xl },
  stateIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: spacing.lg },
  stateMessage: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: spacing.sm, maxWidth: 320 },
  stateButton: { minWidth: 180, marginTop: spacing.xl },
});
