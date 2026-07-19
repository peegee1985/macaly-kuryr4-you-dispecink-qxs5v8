module.exports = {
  expo: {
    name: "Kuryr4You Dispečink",
    slug: "kuryr4you-dispecink",
    scheme: "kuryr4you-dispatcher",
    version: "1.2.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    backgroundColor: "#0F111A",
    primaryColor: "#F59E0B",
    icon: "./assets/icon.png",
    android: {
      package: "cz.kuryr4you.dispatcher",
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F111A",
      },
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      predictiveBackGestureEnabled: true,
    },
    extra: {
      eas: {
        projectId: "f51e480b-2a41-474f-8caf-0342083b4f3e",
      },
    },
    owner: "peegee85",
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
