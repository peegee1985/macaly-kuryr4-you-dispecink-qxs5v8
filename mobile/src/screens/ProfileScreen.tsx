import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, Card, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { DriverUser } from "../types";

export function ProfileScreen({ user, onSignOut }: { user: DriverUser; onSignOut: () => void }) {
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [vehicleType, setVehicleType] = useState(user.vehicleType || "");
  const [vehiclePlate, setVehiclePlate] = useState(user.vehiclePlate || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setVehicleType(user.vehicleType || "");
    setVehiclePlate(user.vehiclePlate || "");
  }, [user]);

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

      <Text style={styles.version}>Kuryr4You Řidič · verze 0.1.0</Text>
    </Screen>
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
  label: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.7, marginBottom: 6, textTransform: "uppercase" },
  inputWrap: { height: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  input: { flex: 1, color: colors.text, fontSize: 14 },
  save: { marginBottom: spacing.sm },
  version: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: spacing.xl },
});
