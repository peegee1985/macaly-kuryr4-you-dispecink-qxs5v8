import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState, PageHeader, Screen } from "../components/ui";
import { LinkifiedText } from "../components/LinkifiedText";
import { formatDateTime } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { ChatConversation, ChatMessage, ChatUser, DispatcherUser } from "../types";

type Partner = { _id: string; name: string; role: string };

export function ChatScreen({ user }: { user: DispatcherUser }) {
  const conversations = useQuery(api.chat.getMyConversations, {}) as ChatConversation[] | undefined;
  const chatUsers = useQuery(api.chat.getChatUsers, {}) as ChatUser[] | undefined;
  const [partner, setPartner] = useState<Partner | null>(null);

  const available = useMemo(() => {
    const byId = new Map<string, Partner>();
    conversations?.forEach((item) => byId.set(item.partnerId, { _id: item.partnerId, name: item.partnerName, role: item.partnerRole }));
    chatUsers?.forEach((item) => byId.set(item._id, { _id: item._id, name: item.name, role: item.role }));
    return [...byId.values()];
  }, [chatUsers, conversations]);

  if (partner) return <Conversation user={user} partner={partner} onBack={() => setPartner(null)} />;

  return (
    <Screen>
      <PageHeader title="Komunikace" subtitle="Zákazníci, řidiči a provozní tým" />
      {available.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="Žádné konverzace" message="Aktivní uživatelé se zobrazí, jakmile jsou dostupní pro chat." />
      ) : (
        <View style={styles.partnerList}>
          {available.map((item) => {
            const conversation = conversations?.find((row) => row.partnerId === item._id);
            return (
              <Pressable key={item._id} accessibilityRole="button" onPress={() => setPartner(item)} style={({ pressed }) => [styles.partnerCard, pressed && styles.pressed]}>
                <View style={styles.avatar}><Ionicons name={roleIcon(item.role)} size={23} color={colors.primary} /></View>
                <View style={styles.partnerCopy}>
                  <View style={styles.partnerTitleRow}>
                    <Text style={styles.partnerName}>{item.name}</Text>
                    {conversation?.unread ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{conversation.unread > 9 ? "9+" : conversation.unread}</Text></View> : null}
                  </View>
                  <Text style={styles.partnerRole}>{roleLabel(item.role)}</Text>
                  {conversation ? <Text style={styles.preview} numberOfLines={1}>{conversation.lastMessage}</Text> : <Text style={styles.preview}>Zahájit novou konverzaci</Text>}
                </View>
                <Ionicons name="chevron-forward" size={21} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Conversation({ user, partner, onBack }: { user: DispatcherUser; partner: Partner; onBack: () => void }) {
  const messages = useQuery(api.chat.getMessages, { partnerId: partner._id }) as ChatMessage[] | undefined;
  const sendMessage = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    void markRead({ partnerId: partner._id });
  }, [markRead, partner._id, messages?.length]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ receiverId: partner._id, text: value });
      setText("");
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(String((err as { message?: string }).message ?? "Zprávu se nepodařilo odeslat."));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <Screen scroll={false} contentStyle={styles.conversationScreen}>
        <PageHeader title={partner.name} subtitle={roleLabel(partner.role)} onBack={onBack} />
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => {
            const mine = item.senderId === user._id;
            return (
              <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <LinkifiedText
                    linkStyle={[styles.messageLink, mine && styles.messageLinkMine]}
                    style={[styles.messageText, mine && styles.messageTextMine]}
                  >
                    {item.text}
                  </LinkifiedText>
                  <Text style={[styles.messageDate, mine && styles.messageDateMine]}>{formatDateTime(item._creationTime)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.emptyConversation}><Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} /><Text style={styles.emptyConversationTitle}>Nová konverzace</Text><Text style={styles.emptyConversationText}>Napište zprávu k zásilce nebo provoznímu požadavku.</Text></View>}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Napište zprávu…"
            placeholderTextColor={colors.textMuted}
            style={styles.composerInput}
            multiline
            maxLength={2000}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Odeslat zprávu" disabled={!text.trim() || sending} onPress={() => void send()} style={[styles.send, (!text.trim() || sending) && styles.sendDisabled]}>
            <Ionicons name="send" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function roleLabel(role: string) {
  if (role === "driver") return "Řidič";
  if (role === "customer") return "Zákazník";
  if (role === "dispatcher") return "Dispečer";
  if (role === "service_driver") return "Servisní řidič";
  if (role === "vending_supervisor") return "Vending supervizor";
  return "Uživatel Kuryr4You";
}

function roleIcon(role: string): "car-sport-outline" | "person-outline" | "headset-outline" | "construct-outline" {
  if (role === "driver") return "car-sport-outline";
  if (role === "customer") return "person-outline";
  if (role === "service_driver" || role === "vending_supervisor") return "construct-outline";
  return "headset-outline";
}

const styles = StyleSheet.create({
  partnerList: { gap: spacing.md },
  partnerCard: { minHeight: 92, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  pressed: { opacity: 0.75 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  partnerCopy: { flex: 1 },
  partnerTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  partnerName: { color: colors.text, fontWeight: "900", fontSize: 15, flex: 1 },
  partnerRole: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 2 },
  preview: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  keyboard: { flex: 1, backgroundColor: colors.background },
  conversationScreen: { paddingHorizontal: 0 },
  messages: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  bubbleWrap: { marginBottom: spacing.sm, flexDirection: "row" },
  bubbleWrapMine: { justifyContent: "flex-end" },
  bubbleWrapOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 17, paddingHorizontal: spacing.md, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  messageTextMine: { color: colors.primaryText },
  messageLink: { color: colors.primary, fontWeight: "800", textDecorationLine: "underline" },
  messageLinkMine: { color: "#172554" },
  messageDate: { color: colors.textMuted, fontSize: 8, marginTop: 5 },
  messageDateMine: { color: "rgba(17,19,24,0.62)", textAlign: "right" },
  emptyConversation: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 70, paddingHorizontal: spacing.xl },
  emptyConversationTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.md },
  emptyConversationText: { color: colors.textMuted, textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  error: { color: "#FCA5A5", fontSize: 11, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  composerInput: { flex: 1, maxHeight: 110, minHeight: 46, borderRadius: 18, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 10, fontSize: 14 },
  send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.42 },
});