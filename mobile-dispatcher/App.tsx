import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomTabs, LoadingView } from "./src/components/ui";
import { useDispatcherNotifications } from "./src/hooks/useDispatcherNotifications";
import { api } from "./src/lib/api";
import { secureAuthStorage } from "./src/lib/storage";
import { AccessScreen, AccountStateScreen, MissingConfigurationScreen } from "./src/screens/AuthScreens";
import { ChatScreen } from "./src/screens/ChatScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { NewRideScreen } from "./src/screens/NewRideScreen";
import { NotificationsModal } from "./src/screens/NotificationsModal";
import { RideDetailModal } from "./src/screens/RideDetailModal";
import { RidesScreen } from "./src/screens/RidesScreen";
import { colors } from "./src/theme";
import type { DispatcherUser, MainTab, Ride } from "./src/types";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl || "https://example.convex.cloud", { unsavedChangesWarning: false });

export default function App() {
  if (!convexUrl) {
    return <SafeAreaProvider><StatusBar style="light" /><MissingConfigurationScreen /></SafeAreaProvider>;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ConvexAuthProvider client={convex} storage={secureAuthStorage}>
        <AuthGate />
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <LoadingView label="Obnovuji přihlášení…" />;
  if (!isAuthenticated) return <AccessScreen />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const user = useQuery(api.users.getMe, {}) as DispatcherUser | null | undefined;
  const { signOut } = useAuthActions();
  const logout = () => void signOut();
  if (user === undefined) return <LoadingView label="Načítám dispečerský profil…" />;
  if (!user) return <LoadingView label="Profil nebyl nalezen…" />;
  if (user.role !== "dispatcher") return <AccountStateScreen state="wrong-role" onSignOut={logout} />;
  if (user.status !== "active") return <AccountStateScreen state="inactive" onSignOut={logout} />;
  return <DispatcherApp user={user} onSignOut={logout} />;
}

function DispatcherApp({ user, onSignOut }: { user: DispatcherUser; onSignOut: () => void }) {
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const unreadChat = (useQuery(api.chat.getUnreadChatCount, {}) as number | undefined) ?? 0;
  const unreadNotifications = (useQuery(api.notifications.getUnreadCount, {}) as number | undefined) ?? 0;
  const notificationSettings = useDispatcherNotifications();

  const openRideById = (rideId: string) => {
    setNotificationsVisible(false);
    const ride = rides?.find((item) => item._id === rideId);
    if (ride) setSelectedRide(ride);
    else setTab("rides");
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === "home" ? <DashboardScreen user={user} unreadNotifications={unreadNotifications} onOpenNotifications={() => setNotificationsVisible(true)} onOpenRide={setSelectedRide} onOpenRides={() => setTab("rides")} onOpenMap={() => setTab("map")} onOpenMore={() => setTab("more")} /> : null}
        {tab === "rides" ? <RidesScreen onOpenRide={setSelectedRide} onNewRide={() => setCreateVisible(true)} /> : null}
        {tab === "map" ? <MapScreen onOpenRide={setSelectedRide} /> : null}
        {tab === "chat" ? <ChatScreen user={user} /> : null}
        {tab === "more" ? <MoreScreen user={user} unreadNotifications={unreadNotifications} onOpenNotifications={() => setNotificationsVisible(true)} notifications={notificationSettings} onSignOut={onSignOut} /> : null}
      </View>
      <BottomTabs active={tab} onChange={setTab} badges={{ chat: unreadChat, more: unreadNotifications }} />
      <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      <NotificationsModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onOpenRide={openRideById} />
      <Modal visible={createVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setCreateVisible(false)}>
        <NewRideScreen onCancel={() => setCreateVisible(false)} onCreated={() => { setCreateVisible(false); setTab("rides"); }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, screen: { flex: 1 } });
