import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { BottomTabs, LoadingView } from "./src/components/ui";
import { useCustomerNotifications } from "./src/hooks/useCustomerNotifications";
import { api } from "./src/lib/api";
import { secureAuthStorage } from "./src/lib/storage";
import { AccessScreen, AccountStateScreen, MissingConfigurationScreen } from "./src/screens/AuthScreens";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { NewRideScreen } from "./src/screens/NewRideScreen";
import { NotificationsModal } from "./src/screens/NotificationsModal";
import { RideDetailModal } from "./src/screens/RideDetailModal";
import { RidesScreen } from "./src/screens/RidesScreen";
import { colors } from "./src/theme";
import type { CustomerUser, MainTab, Ride, RideTemplate } from "./src/types";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl || "https://example.convex.cloud", { unsavedChangesWarning: false });

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
  if (!isAuthenticated) return <AccessScreen />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const user = useQuery(api.users.getMe, {}) as CustomerUser | null | undefined;
  const { signOut } = useAuthActions();
  if (user === undefined) return <LoadingView label="Načítám zákaznický profil…" />;
  if (!user) return <LoadingView label="Profil nebyl nalezen…" />;
  const logout = () => void signOut();
  if (user.role !== "customer") return <AccountStateScreen state="wrong-role" onSignOut={logout} />;
  if (user.status !== "active") return <AccountStateScreen state="inactive" onSignOut={logout} />;
  return <CustomerApp user={user} onSignOut={logout} />;
}

function CustomerApp({ user, onSignOut }: { user: CustomerUser; onSignOut: () => void }) {
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [template, setTemplate] = useState<RideTemplate | undefined>();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const rides = useQuery(api.rides.getMyRides, {}) as Ride[] | undefined;
  const unreadNotifications = (useQuery(api.notifications.getUnreadCount, {}) as number | undefined) ?? 0;
  const notificationSettings = useCustomerNotifications();

  const openNew = (prefill?: RideTemplate) => {
    setTemplate(prefill);
    setTab("new");
  };
  const changeTab = (next: MainTab) => {
    if (next === "new") setTemplate(undefined);
    setTab(next);
  };
  const openRideById = (rideId: string) => {
    const ride = rides?.find((item) => item._id === rideId);
    setNotificationsVisible(false);
    if (ride) setSelectedRide(ride);
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === "home" ? (
          <DashboardScreen
            user={user}
            unreadNotifications={unreadNotifications}
            onOpenNotifications={() => setNotificationsVisible(true)}
            onOpenRide={setSelectedRide}
            onNewRide={() => openNew()}
            onOpenRides={() => setTab("rides")}
            onOpenProfile={() => setTab("more")}
          />
        ) : null}
        {tab === "rides" ? <RidesScreen onOpenRide={setSelectedRide} onNewRide={() => openNew()} /> : null}
        {tab === "new" ? <NewRideScreen user={user} initialTemplate={template} onCreated={() => { setTemplate(undefined); setTab("rides"); }} /> : null}
        {tab === "more" ? (
          <MoreScreen
            user={user}
            unreadNotifications={unreadNotifications}
            onOpenNotifications={() => setNotificationsVisible(true)}
            notifications={notificationSettings}
            onUseTemplate={openNew}
            onSignOut={onSignOut}
          />
        ) : null}
      </View>
      <BottomTabs active={tab} onChange={changeTab} badges={{ more: unreadNotifications }} />
      <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      <NotificationsModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onOpenRide={openRideById} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});
