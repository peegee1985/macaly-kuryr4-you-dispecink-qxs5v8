import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { ChatConversation, ChatMessage, ChatUser, DriverUser } from "../types";

type Partner = { id: string; name: string; role?: string };

export function ChatScreen({ user }: { user: DriverUser }) {
  const conversations = useQuery(api.chat.getMyConversations, {}) as ChatConversation[] | undefined;
  const chatUsers = useQuery(api.chat.getChatUsers, {}) as ChatUser[] | undefined;
  const [search, setSearch] = useState("");
  const [partner, setPartner] = useState<Partner | null>(null);

  const people = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("cs-CZ");
    const existing = new Set((conversations ?? []).map((item) => item.partnerId));
    const conversationRows = (conversations ?? [])
      .filter((item) => !query || item.partnerName.toLocaleLowerCase("cs-CZ").includes(query))
      .map((item) => ({ kind: "conversation" as const, ...item }));
    const newRows = (chatUsers ?? [])
      .filter((item) => !existing.has(item._id))
      .filter((item) => !query || item.name.toLocaleLowerCase("cs-CZ").includes(query))
      .map((item) => ({ kind: "user" as const, ...item }));
    return [...conversationRows, ...newRows];
  }, [chatUsers, conversations, search]);

  if (partner) {
    return <Conversation user={user} partner={partner} onBack={() => setPartner(null)} />;
  }

  return (
    <Screen>
      <PageHeader title="Chat" subtitle="Spojení s dispečinkem a řidiči" />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={19} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Hledat osobu…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {conversations === undefined || chatUsers === undefined ? (
        <Text style={styles.loading}>Načítám konverzace…</Text>
      ) : people.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="Žádná konverzace" message="Dispečer a aktivní řidiči se zobrazí v tomto seznamu." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.people}>
          {people.map((item) => {
            const isConversation = item.kind === "conversation";
            const id = isConversation ? item.partnerId : item._id;
            const name = isConversation ? item.partnerName : item.name;
            const role = isConversation ? item.partnerRole : item.role;
            return (
              <Pressable
                accessibilityRole="button"
                key={id}
                onPress={() => setPartner({ id, name, role })}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                  {isConversation && item.unread > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread > 9 ? "9+" : item.unread}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.personCopy}>
                  <View style={styles.personTitleRow}>
                    <Text style={styles.personName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.role}>{role === "dispatcher" ? "Dispečer" : "Řidič"}</Text>
                  </View>
                  <Text style={[styles.preview, isConversation && item.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                    {isConversation ? item.lastMessage : "Zahájit novou konverzaci"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

function Conversation({ user, partner, onBack }: { user: DriverUser; partner: Partner; onBack: () => void }) {
  const messages = useQuery(api.chat.getMessages, { partnerId: partner.id }) as ChatMessage[] | undefined;
  const sendMessage = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    void markRead({ partnerId: partner.id }).catch(() => undefined);
  }, [markRead, messages?.length, partner.id]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await sendMessage({ receiverId: partner.id, text: value });
      setText("");
    } catch (cause) {
      Alert.alert("Zprávu nelze odeslat", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll={false} contentStyle={styles.conversationScreen}>
        <View style={styles.conversationHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zpět na konverzace" onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>{partner.name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.personCopy}>
            <Text style={styles.personName} numberOfLines={1}>{partner.name}</Text>
            <Text style={styles.preview}>{partner.role === "dispatcher" ? "Dispečer" : "Řidič"}</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={messages === undefined
            ? <Text style={styles.loading}>Načítám zprávy…</Text>
            : <Text style={styles.chatEmpty}>Zatím bez zpráv. Napište jako první.</Text>}
          renderItem={({ item }) => {
            const mine = item.senderId === user._id;
            return (
              <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text>
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>
                    {new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(item._creationTime)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            placeholder="Napište zprávu…"
            placeholderTextColor={colors.textMuted}
            style={styles.composerInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Odeslat zprávu"
            disabled={!text.trim() || sending}
            onPress={() => void send()}
            style={[styles.send, (!text.trim() || sending) && styles.sendDisabled]}
          >
            <Ionicons name={sending ? "time-outline" : "send"} size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  searchWrap: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  loading: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  people: { gap: spacing.sm, paddingBottom: spacing.md },
  person: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.75 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.14)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  avatarText: { color: colors.primary, fontSize: 17, fontWeight: "900" },
  unreadBadge: { position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },
  unreadText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  personCopy: { flex: 1, minWidth: 0 },
  personTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  personName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" },
  role: { color: colors.primary, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  preview: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  previewUnread: { color: colors.text, fontWeight: "700" },
  conversationScreen: { paddingHorizontal: 0, paddingBottom: 0 },
  conversationHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.surfaceRaised },
  smallAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(245,158,11,0.14)", alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: colors.primary, fontWeight: "900" },
  messages: { flexGrow: 1, justifyContent: "flex-end", padding: spacing.md, gap: spacing.sm },
  chatEmpty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xxl },
  messageRow: { alignItems: "flex-start" },
  messageRowMine: { alignItems: "flex-end" },
  bubble: { maxWidth: "84%", paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 16, borderBottomLeftRadius: 5, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.primary, borderColor: colors.primary, borderBottomLeftRadius: 16, borderBottomRightRadius: 5 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  messageTextMine: { color: colors.primaryText },
  messageTime: { color: colors.textMuted, fontSize: 9, marginTop: 4, textAlign: "right" },
  messageTimeMine: { color: "rgba(17,19,24,0.65)" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 110, color: colors.text, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.md, paddingTop: 11, paddingBottom: 10, fontSize: 14 },
  send: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.35 },
});
