import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";

type Profile = {
  pendingLevelUp?: boolean;
  pendingLevelUpLevel?: number;
  pendingLevelUpTitle?: string;
};

export function LevelUpModal() {
  const profile = useQuery(api.gamification.getMyProfile, {}) as Profile | null | undefined;
  const acknowledge = useMutation(api.gamification.acknowledgeLevelUp);
  const visible = Boolean(profile?.pendingLevelUp);

  const close = () => {
    void acknowledge({});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.ring}>
            <Ionicons name="trophy" color={colors.primary} size={42} />
          </View>
          <Text style={styles.eyebrow}>NOVÁ ÚROVEŇ</Text>
          <Text style={styles.level}>Level {profile?.pendingLevelUpLevel ?? ""}</Text>
          <Text style={styles.title}>{profile?.pendingLevelUpTitle ?? "Skvělá práce"}</Text>
          <Text style={styles.message}>Pokračuj ve spolehlivých jízdách a plnění výzev.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Potvrdit novou úroveň"
            onPress={close}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Pokračovat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.55)",
    padding: spacing.xl,
    alignItems: "center",
  },
  ring: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  level: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: spacing.xs },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.xs },
  message: { color: colors.textMuted, textAlign: "center", lineHeight: 20, marginTop: spacing.sm },
  button: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: colors.primaryText, fontWeight: "900", fontSize: 15 },
});
