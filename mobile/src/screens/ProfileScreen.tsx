import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AppButton, Card, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { DRIVER_APP_VERSION } from "../lib/appVersion";
import { ensureStatusNotificationPermission, setStatusNotificationsEnabled } from "../lib/statusNotifications";
import { colors, radius, spacing } from "../theme";
import type { DriverUser } from "../types";

export function ProfileScreen({
  user,
  onSignOut,
  statusNotificationsEnabled,
  onStatusNotificationsChange,
}: {
  user: DriverUser;
  onSignOut: () => void;
  statusNotificationsEnabled: boolean;
  onStatusNotificationsChange: (enabled: boolean) => void;
}) {
  const updateProfile = useMutation(api.users.updateMyProfile);
  const updateNotifPrefs = useMutation(api.users.updateNotifPrefs);
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [vehicleType, setVehicleType] = useState(user.vehicleType || "");
  const [vehiclePlate, setVehiclePlate] = useState(user.vehiclePlate || "");
  const [saving, setSaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    assigned: user.driverPushAssigned !== false,
    available: user.driverPushAvailable !== false,
    email: user.driverEmailAssigned !== false,
  });

  useEffect(() => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setVehicleType(user.vehicleType || "");
    setVehiclePlate(user.vehiclePlate || "");
    setPrefs({
      assigned: user.driverPushAssigned !== false,
      available: user.driverPushAvailable !== false,
      email: user.driverEmailAssigned !== false,
    });
  }, [user]);

  const toggleStatusNotification = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensureStatusNotificationPermission();
      if (!granted) {
        Alert.alert("Notifikace nejsou povolené", "Povolte oznámení Kuryr4You v nastavení Androidu.", [
          { text: "Zrušit", style: "cancel" },
          { text: "Otevřít nastavení", onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
    }
    await setStatusNotificationsEnabled(enabled);
    onStatusNotificationsChange(enabled);
  };

  const togglePreference = async (key: "assigned" | "available" | "email", value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPrefsSaving(true);
    try {
      await updateNotifPrefs({
        driverPushAssigned: next.assigned,
        driverPushAvailable: next.available,
        driverEmailAssigned: next.email,
      });
    } catch (cause) {
      setPrefs(previous);
      Alert.alert("Nastavení nelze uložit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setPrefsSaving(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Chybí jméno", "Zadejte jméno řidiče.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        vehicleType: vehicleType.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
      });
      Alert.alert("Uloženo", "Profil řidiče byl aktualizován.");
    } catch (cause) {
      Alert.alert("Profil nelze uložit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="Profil řidiče" subtitle={user.email} />

      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || user.email || "R").slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>{user.name || "Řidič"}</Text>
          <View style={styles.activeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Aktivní řidič</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Osobní údaje</Text>
      <Card style={styles.form}>
        <Field icon="person-outline" label="Jméno" value={name} onChangeText={setName} />
        <Field icon="call-outline" label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Card>

      <Text style={styles.sectionTitle}>Vozidlo</Text>
      <Card style={styles.form}>
        <Field icon="car-outline" label="Typ vozidla" value={vehicleType} onChangeText={setVehicleType} placeholder="Dodávka, osobní…" />
        <Field icon="card-outline" label="SPZ" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />
      </Card>

      <Text style={styles.sectionTitle}>Oznámení</Text>
      <Card style={styles.toggles}>
        <ToggleRow
          icon="phone-portrait-outline"
          title="Stav v liště Androidu"
          subtitle="Přihlášení, GPS, zakázka a její fáze i na zamčené obrazovce"
          value={statusNotificationsEnabled}
          onValueChange={(value) => void toggleStatusNotification(value)}
        />
        <ToggleRow
          icon="cube-outline"
          title="Přiřazená zakázka"
          subtitle="Upozornit při nové zakázce od dispečera"
          value={prefs.assigned}
          disabled={prefsSaving}
          onValueChange={(value) => void togglePreference("assigned", value)}
        />
        <ToggleRow
          icon="radio-outline"
          title="Volné zakázky"
          subtitle="Upozornit na nové dostupné jízdy"
          value={prefs.available}
          disabled={prefsSaving}
          onValueChange={(value) => void togglePreference("available", value)}
        />
        <ToggleRow
          icon="mail-outline"
          title="E-mail při přiřazení"
          subtitle="Poslat potvrzení také e-mailem"
          value={prefs.email}
          disabled={prefsSaving}
          onValueChange={(value) => void togglePreference("email", value)}
          last
        />
      </Card>

      <AppButton title="Uložit změny" icon="save-outline" loading={saving} onPress={() => void save()} style={styles.save} />
      <AppButton
        title="Odhlásit se"
        icon="log-out-outline"
        variant="secondary"
        onPress={() => Alert.alert("Odhlásit se?", "Ukončíte aktuální relaci v aplikaci.", [
          { text: "Zpět", style: "cancel" },
          { text: "Odhlásit", style: "destructive", onPress: onSignOut },
        ])}
      />

      <Text style={styles.version}>Kuryr4You Řidič · verze {DRIVER_APP_VERSION}</Text>
    </Screen>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, last && styles.toggleRowLast]}>
      <View style={styles.toggleIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceRaised, true: "rgba(245,158,11,0.45)" }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

function Field({ icon, label, ...props }: React.ComponentProps<typeof TextInput> & { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} color={colors.textMuted} size={19} />
        <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primaryText, fontSize: 24, fontWeight: "900" },
  identityCopy: { flex: 1 },
  identityName: { color: colors.text, fontSize: 17, fontWeight: "800" },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  activeText: { color: colors.success, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: spacing.sm },
  form: { gap: spacing.lg, marginBottom: spacing.lg },
  toggles: { paddingVertical: 0, marginBottom: spacing.lg },
  toggleRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.12)" },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  toggleSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.7, marginBottom: 6, textTransform: "uppercase" },
  inputWrap: { height: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, color: colors.text, fontSize: 14 },
  save: { marginBottom: spacing.sm },
  version: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: spacing.xl },
});
