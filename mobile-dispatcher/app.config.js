module.exports = {
  expo: {
    name: "Kuryr4You Dispečink",
    slug: "kuryr4you-dispecink",
    scheme: "kuryr4you-dispatcher",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    backgroundColor: "#0F111A",
    primaryColor: "#F59E0B",
    icon: "./assets/icon.png",
    android: {
      package: "cz.kuryr4you.dispatcher",
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F111A",
      },
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      predictiveBackGestureEnabled: true,
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#F59E0B",
          defaultChannel: "k4y-dispatcher",
        },
      ],
      ["expo-secure-store", { configureAndroidBackup: true }],
      "./plugins/withDispatcherAppName",
      "./plugins/withStandaloneApk",
      "expo-font",
    ],
  },
};
