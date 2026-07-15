import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { Card, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, toIsoDate } from "../lib/format";
import { colors, spacing } from "../theme";
import type { Availability } from "../types";

export function AvailabilityScreen() {
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  }), []);
  const startDate = toIsoDate(days[0]!);
  const endDate = toIsoDate(days[days.length - 1]!);
  const availability = useQuery(api.availability.getMyAvailability, { startDate, endDate }) as Availability[] | undefined;
  const setAvailability = useMutation(api.availability.setAvailability);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const byDate = new Map((availability ?? []).map((entry) => [entry.date, entry]));

  const toggle = async (date: string, available: boolean) => {
    setBusyDate(date);
    try {
      await setAvailability({
        date,
        available,
        startTime: available ? "08:00" : undefined,
        endTime: available ? "18:00" : undefined,
      });
    } catch (cause) {
      Alert.alert("Dostupnost nelze uložit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setBusyDate(null);
    }
  };

  return (
    <Screen>
      <PageHeader title="Dostupnost" subtitle="Nastavte dispečinku své směny na příštích 14 dní" />

      <Card style={styles.info}>
        <Text style={styles.infoTitle}>Výchozí čas směny</Text>
        <Text style={styles.infoText}>Dostupné dny se ukládají jako 08:00–18:00. Přesný čas může dispečer upravit ve webovém portálu.</Text>
      </Card>

      <View style={styles.list}>
        {days.map((date, index) => {
          const key = toIsoDate(date);
          const entry = byDate.get(key);
          const enabled = entry?.available ?? false;
          return (
            <Card key={key} style={[styles.day, enabled && styles.dayActive]}>
              <View style={styles.dateBadge}>
                <Text style={styles.dayNumber}>{date.getDate()}</Text>
                <Text style={styles.month}>{new Intl.DateTimeFormat("cs-CZ", { month: "short" }).format(date)}</Text>
              </View>
              <View style={styles.dayCopy}>
                <Text style={styles.dayName}>{index === 0 ? "Dnes" : formatDate(date.getTime())}</Text>
                <Text style={[styles.dayStatus, enabled && styles.dayStatusActive]}>{enabled ? `${entry?.startTime || "08:00"}–${entry?.endTime || "18:00"}` : "Nedostupný"}</Text>
              </View>
              <Switch
                value={enabled}
                disabled={busyDate === key || availability === undefined}
                onValueChange={(value) => void toggle(key, value)}
                trackColor={{ false: colors.surfaceRaised, true: "rgba(245,158,11,0.45)" }}
                thumbColor={enabled ? colors.primary : colors.textMuted}
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { marginBottom: spacing.lg, gap: spacing.xs },
  infoTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  infoText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  list: { gap: spacing.sm },
  day: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  dayActive: { borderColor: "rgba(245,158,11,0.45)" },
  dateBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  dayNumber: { color: colors.text, fontSize: 18, lineHeight: 20, fontWeight: "900" },
  month: { color: colors.textMuted, fontSize: 9, textTransform: "uppercase", fontWeight: "700" },
  dayCopy: { flex: 1 },
  dayName: { color: colors.text, fontSize: 14, fontWeight: "800", textTransform: "capitalize" },
  dayStatus: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  dayStatusActive: { color: colors.primary },
});
