import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing } from "../theme";
import type { MainTab, RideStatus } from "../types";
import { rideStatusColor, rideStatusLabel } from "../lib/format";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>KURYR4YOU</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({
  title,
  icon,
  variant = "primary",
  loading = false,
  style,
  ...props
}: PressableProps & {
  title: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle = buttonStyles[variant];
  const textStyle = buttonTextStyles[variant]!;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || props.disabled}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        style,
        pressed && styles.buttonPressed,
        (loading || props.disabled) && styles.disabled,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textStyle.color} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} color={textStyle.color} size={18} /> : null}
          <Text style={[styles.buttonText, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
};

const buttonTextStyles: Record<string, { color: string }> = {
  primary: { color: colors.primaryText },
  secondary: { color: colors.text },
  danger: { color: colors.white },
  ghost: { color: colors.primary },
};

export function StatusPill({ status }: { status: RideStatus }) {
  const color = rideStatusColor[status];
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{rideStatusLabel[status]}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </Card>
  );
}

export function LoadingView({ label = "Načítám…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

const tabs: Array<{ key: MainTab; label: string; icon: IconName; activeIcon: IconName }> = [
  { key: "home", label: "Přehled", icon: "grid-outline", activeIcon: "grid" },
  { key: "rides", label: "Zakázky", icon: "cube-outline", activeIcon: "cube" },
  { key: "vending", label: "Vending", icon: "storefront-outline", activeIcon: "storefront" },
  { key: "availability", label: "Směny", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "profile", label: "Profil", icon: "person-outline", activeIcon: "person" },
];

export function BottomTabs({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.tabItem}>
            <Ionicons
              name={selected ? tab.activeIcon : tab.icon}
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: 108 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1.8 },
  title: { color: colors.text, fontWeight: "800", fontSize: 28, letterSpacing: -0.7, marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  buttonText: { fontWeight: "800", fontSize: 15 },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontWeight: "700", fontSize: 11 },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  emptyMessage: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 14 },
  loadingText: { color: colors.textMuted, fontWeight: "600" },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 18,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  tabLabelActive: { color: colors.primary },
});
