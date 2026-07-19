import * as Notifications from "expo-notifications";
import { registerRootComponent } from "expo";

import App from "./App";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

registerRootComponent(App);
