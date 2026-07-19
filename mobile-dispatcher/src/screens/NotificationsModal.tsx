import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { DispatcherNotification } from "../types";

export function NotificationsModal({ visible, onClose, onOpenRide }: { visible: boolean; onClose: () => void; onOpenRide: (rideId: string) => void }) {
  const insets = useSafeAreaInsets();
  const notifications = useQuery(api.notifications.getMyNotifications, {}) as DispatcherNotification[] | undefined;
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const open = async (item: DispatcherNotification) => {
    if (!item.read) await markAsRead({ notificationId: item._id });
    if (item.rideId) onOpenRide(item.rideId);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <View>
            <Text style={styles.eyebrow}>KURYR4YOU</Text>
            <Text style={styles.title}>Oznámení</Text>
          </View>
          <View style={styles.headerActions}>
            {notifications?.some((item) => !item.read) ? (
              <Pressable accessibilityRole="button" onPress={() => void markAllAsRead({})} style={styles.readAll}>
                <Text style={styles.readAllText}>Přečíst vše</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Zavřít" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          {notifications?.length === 0 ? <EmptyState icon="notifications-off-outline" title="Žádná oznámení" message="Nové informace o zásilkách se zobrazí zde." /> : null}
          {notifications?.map((item) => (
            <Pressable key={item._id} accessibilityRole="button" onPress={() => void open(item)} style={[styles.item, !item.read && styles.itemUnread]}>
              <View style={[styles.itemIcon, { backgroundColor: `${notificationColor[item.type]}18` }]}>
                <Ionicons name={notificationIcon[item.type]} size={21} color={notificationColor[item.type]} />
              </View>
              <View style={styles.itemCopy}>
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.itemMessage}>{item.message}</Text>
                <Text style={styles.itemDate}>{formatDateTime(item._creationTime)}</Text>
              </View>
              {item.rideId ? <Ionicons name="chevron-forward" size={19} color={colors.textMuted} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const notificationIcon: Record<DispatcherNotification["type"], "cube-outline" | "person-add-outline" | "document-text-outline" | "checkmark-circle-outline" | "information-circle-outline"> = {
  ride_status: "cube-outline",
  ride_assigned: "person-add-outline",
  invoice: "document-text-outline",
  approval: "checkmark-circle-outline",
  system: "information-circle-outline",
};
const notificationColor: Record<DispatcherNotification["type"], string> = {
  ride_status: colors.info,
  ride_assigned: "#A78BFA",
  invoice: colors.primary,
  approval: colors.success,
  system: colors.textMuted,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 78, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.text, fontWeight: "900", fontSize: 23, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  readAll: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  readAllText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  close: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.sm },
  item: { minHeight: 94, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemUnread: { borderColor: "rgba(245,158,11,0.42)", backgroundColor: "rgba(245,158,11,0.06)" },
  itemIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  itemCopy: { flex: 1 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: "800", flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  itemMessage: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  itemDate: { color: colors.textMuted, fontSize: 9, marginTop: 6 },
});
