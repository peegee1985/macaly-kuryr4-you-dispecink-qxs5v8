const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: "Kuryr4You Dispecink",
    slug: "kuryr4you-dispecink",
    scheme: "kuryr4you-dispatcher",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    backgroundColor: "#0F111A",
    primaryColor: "#F59E0B",
    icon: "./assets/icon.png",
    android: {
      package: "cz.kuryr4you.dispatcher",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#0F111A",
      },
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      predictiveBackGestureEnabled: true,
      ...(mapsApiKey ? { config: { googleMaps: { apiKey: mapsApiKey } } } : {}),
    },
    plugins: [
      ["expo-notifications", { icon: "./assets/icon.png", color: "#F59E0B", defaultChannel: "k4y-dispatcher" }],
      ["expo-secure-store", { configureAndroidBackup: true }],
      "./plugins/withDispatcherAppName",
      "./plugins/withStandaloneApk",
      "expo-font",
    ],
  },
};
