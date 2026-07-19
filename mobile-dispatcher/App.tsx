import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  WebView,
  type WebViewNavigation,
} from "react-native-webview";
import type {
  AndroidWebViewProps,
  WebViewHttpErrorEvent,
} from "react-native-webview/lib/WebViewTypes";

const DISPATCH_URL = "https://kuryr4you.cz/dispatcer";
const ALLOWED_HOSTS = new Set(["kuryr4you.cz", "www.kuryr4you.cz"]);

type WebViewHandle = {
  goBack: () => void;
};

// react-native-webview 13 combines all platform props into an impossible
// intersection under React Native 0.86. This Android-only shell narrows the
// public component type while keeping the runtime component unchanged.
const AndroidWebView = WebView as unknown as ForwardRefExoticComponent<
  AndroidWebViewProps & RefAttributes<WebViewHandle>
>;

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DispatcherApp />
    </SafeAreaProvider>
  );
}

function DispatcherApp() {
  const webViewRef = useRef<WebViewHandle>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigation = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  const allowNavigation = useCallback((request: { url: string }) => {
    try {
      const url = new URL(request.url);
      if (url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname)) return true;
      if (["tel:", "mailto:", "geo:"].includes(url.protocol)) {
        void Linking.openURL(request.url);
      }
    } catch {
      return false;
    }
    return false;
  }, []);

  const retry = () => {
    setLoadError(false);
    setReloadKey((value) => value + 1);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <AndroidWebView
        key={reloadKey}
        ref={webViewRef}
        source={{ uri: DISPATCH_URL }}
        originWhitelist={["https://kuryr4you.cz/*", "https://www.kuryr4you.cz/*"]}
        onNavigationStateChange={handleNavigation}
        onShouldStartLoadWithRequest={allowNavigation}
        onLoadStart={() => setLoadError(false)}
        onError={() => setLoadError(true)}
        onHttpError={(event: WebViewHttpErrorEvent) => {
          if (event.nativeEvent.statusCode >= 500) setLoadError(true);
        }}
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        applicationNameForUserAgent="Kuryr4YouDispatcher/1.1"
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Načítám dispečink…</Text>
          </View>
        )}
        style={styles.webView}
      />

      {loadError ? (
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Dispečink se nepodařilo načíst</Text>
          <Text style={styles.errorText}>Zkontrolujte připojení a zkuste to znovu.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Znovu načíst dispečink"
            onPress={retry}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          >
            <Text style={styles.retryText}>Zkusit znovu</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F111A" },
  webView: { flex: 1, backgroundColor: "#0F111A" },
  loading: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F111A",
    gap: 12,
  },
  loadingText: { color: "#9198A8", fontSize: 14, fontWeight: "600" },
  error: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F111A",
    padding: 28,
  },
  errorTitle: { color: "#EDF0F7", fontSize: 19, fontWeight: "800", textAlign: "center" },
  errorText: { color: "#9198A8", fontSize: 14, textAlign: "center", marginTop: 8 },
  retry: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 22,
  },
  retryPressed: { opacity: 0.8 },
  retryText: { color: "#111318", fontSize: 15, fontWeight: "900" },
});
