import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { AppNotification } from "../types";

export function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const notifications = useQuery(api.notifications.getMyNotifications, {}) as AppNotification[] | undefined;
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zavřít oznámení" onPress={onClose} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Oznámení</Text>
            <Text style={styles.subtitle}>Zakázky a zprávy z dispečinku</Text>
          </View>
          <Pressable onPress={() => void markAllAsRead()} style={styles.markAll}>
            <Text style={styles.markAllText}>Přečíst vše</Text>
          </Pressable>
        </View>

        <FlatList
          data={notifications ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={notifications === undefined
            ? <Text style={styles.loading}>Načítám oznámení…</Text>
            : <EmptyState icon="notifications-outline" title="Žádná oznámení" message="Nové události ze zakázek se zobrazí zde." />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => !item.read && void markAsRead({ notificationId: item._id })}
              style={[styles.notification, !item.read && styles.notificationUnread]}
            >
              <View style={[styles.icon, !item.read && styles.iconUnread]}>
                <Ionicons name={item.type === "ride_assigned" ? "cube" : "notifications"} size={20} color={item.read ? colors.textMuted : colors.primary} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  {!item.read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(item._creationTime)}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 78, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: "900" },
  subtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  markAll: { minHeight: 38, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
  markAllText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  list: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm },
  loading: { color: colors.textMuted, textAlign: "center", paddingTop: spacing.xxl },
  notification: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  notificationUnread: { borderColor: "rgba(245,158,11,0.45)", backgroundColor: "rgba(245,158,11,0.07)" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  iconUnread: { backgroundColor: "rgba(245,158,11,0.14)" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  notificationTitle: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "800" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  message: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  time: { color: colors.textMuted, opacity: 0.75, fontSize: 9, marginTop: spacing.sm },
});
