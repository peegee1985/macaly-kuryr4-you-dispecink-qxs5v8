import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { LevelUpModal } from "./src/components/LevelUpModal";
import { BottomTabs, LoadingView } from "./src/components/ui";
import { useGpsTracking } from "./src/hooks/useGpsTracking";
import { useDriverStatusNotification } from "./src/hooks/useDriverStatusNotification";
import { api } from "./src/lib/api";
import { secureAuthStorage } from "./src/lib/storage";
import { getStatusNotificationsEnabled } from "./src/lib/statusNotifications";
import { AccountStateScreen, LoginScreen, MissingConfigurationScreen } from "./src/screens/AuthScreens";
import { AvailabilityScreen } from "./src/screens/AvailabilityScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { GamificationScreen } from "./src/screens/GamificationScreen";
import { NotificationsModal } from "./src/screens/NotificationsModal";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RideDetailModal } from "./src/screens/RideDetailModal";
import { RidesScreen } from "./src/screens/RidesScreen";
import { VendingScreen } from "./src/screens/VendingScreen";
import { VisitDetailModal } from "./src/screens/VisitDetailModal";
import { colors } from "./src/theme";
import type { DriverUser, MainTab, Ride, ServiceVisit } from "./src/types";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl || "https://example.convex.cloud", {
  unsavedChangesWarning: false,
});

export default function App() {
  if (!convexUrl) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <MissingConfigurationScreen />
      </SafeAreaProvider>
    );
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
  if (!isAuthenticated) return <LoginScreen />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const user = useQuery(api.users.getMe, {}) as DriverUser | null | undefined;
  const { signOut } = useAuthActions();

  if (user === undefined) return <LoadingView label="Načítám profil řidiče…" />;
  if (!user) return <LoadingView label="Profil nebyl nalezen…" />;

  const logout = () => void signOut();
  if (user.role !== "driver") return <AccountStateScreen state="wrong-role" onSignOut={logout} />;
  if (user.status === "pending") return <AccountStateScreen state="pending" onSignOut={logout} />;
  if (user.status === "blocked" || user.status === "inactive") return <AccountStateScreen state="blocked" onSignOut={logout} />;

  return <DriverApp user={user} onSignOut={logout} />;
}

function DriverApp({ user, onSignOut }: { user: DriverUser; onSignOut: () => void }) {
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ServiceVisit | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [statusNotificationsEnabled, setStatusNotificationsEnabledState] = useState(false);
  const gps = useGpsTracking();
  const rides = useQuery(api.rides.getDriverRides, {}) as Ride[] | undefined;
  const unreadChat = useQuery(api.chat.getUnreadChatCount, {}) as number | undefined;
  const initializeGamification = useMutation(api.gamification.initializeMyGamification);
  const activeRide = useMemo(() => {
    const priorities: Ride["status"][] = ["transit", "pickup", "assigned", "approved", "pending"];
    return (rides ?? [])
      .filter((ride) => !["delivered", "cancelled", "failed"].includes(ride.status))
      .sort((a, b) => priorities.indexOf(a.status) - priorities.indexOf(b.status))[0] ?? null;
  }, [rides]);

  useDriverStatusNotification({
    user,
    tracking: gps.tracking,
    activeRide,
    enabled: statusNotificationsEnabled,
  });

  useEffect(() => {
    void getStatusNotificationsEnabled().then(setStatusNotificationsEnabledState);
  }, []);

  useEffect(() => {
    void initializeGamification({}).catch((error: unknown) => {
      console.warn("[gamification] initialization failed", error);
    });
  }, [initializeGamification]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === "rides") setTab("rides");
      if (screen === "chat") setTab("chat");
    });
    return () => subscription.remove();
  }, []);

  const logout = async () => {
    if (gps.tracking) await gps.stop();
    onSignOut();
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === "home" ? (
          <DashboardScreen
            user={user}
            tracking={gps.tracking}
            gpsBusy={gps.busy}
            gpsError={gps.error}
            onGpsToggle={() => void (gps.tracking ? gps.stop() : gps.start())}
            onOpenRide={setSelectedRide}
            onOpenRides={() => setTab("rides")}
            onOpenGamification={() => setTab("gamification")}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        ) : null}
        {tab === "rides" ? <RidesScreen onOpenRide={setSelectedRide} /> : null}
        {tab === "chat" ? <ChatScreen user={user} /> : null}
        {tab === "gamification" ? <GamificationScreen /> : null}
        {tab === "vending" ? <VendingScreen onOpenVisit={setSelectedVisit} /> : null}
        {tab === "availability" ? <AvailabilityScreen /> : null}
        {tab === "profile" ? (
          <ProfileScreen
            user={user}
            onSignOut={() => void logout()}
            statusNotificationsEnabled={statusNotificationsEnabled}
            onStatusNotificationsChange={setStatusNotificationsEnabledState}
          />
        ) : null}
      </View>

      <BottomTabs active={tab} onChange={setTab} badges={{ chat: unreadChat ?? 0 }} />
      <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      <VisitDetailModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      <NotificationsModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <LevelUpModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});
