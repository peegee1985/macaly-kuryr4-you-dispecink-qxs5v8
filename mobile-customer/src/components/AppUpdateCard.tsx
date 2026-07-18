import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, StyleSheet, Text, View } from "react-native";

import { useAppUpdate } from "../hooks/useAppUpdate";
import { colors, spacing } from "../theme";
import { AppButton, Card } from "./ui";

export function AppUpdateCard() {
  const { release, required } = useAppUpdate();

  if (!release) return null;

  return (
    <Card style={[styles.card, required && styles.required]}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="cloud-download-outline" color={colors.primary} size={23} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{required ? "Je nutná aktualizace" : "Je dostupná nová verze"}</Text>
          <Text style={styles.subtitle}>Kuryr4You Zákazník {release.version}</Text>
        </View>
      </View>
      {release.releaseNotes?.length ? (
        <View style={styles.notes}>
          {release.releaseNotes.slice(0, 3).map((note) => (
            <Text key={note} style={styles.note}>• {note}</Text>
          ))}
        </View>
      ) : null}
      <AppButton
        title="Stáhnout aktualizaci"
        icon="download-outline"
        onPress={() => void Linking.openURL(release.downloadUrl)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.lg, borderColor: "rgba(245,158,11,0.5)" },
  required: { borderColor: "rgba(239,68,68,0.65)" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.12)" },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  notes: { gap: 3 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
});
