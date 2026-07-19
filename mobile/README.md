# Kuryr4You Řidič — Android

Nativní mobilní klient postavený v React Native/Expo. Aplikace není PWA ani WebView; výstupem je standardní APK nebo AAB.

Roadmapa skutečných push notifikací, akcí v oznámeních a dispečerského Android
widgetu je v [`../docs/NATIVE_ANDROID_PUSH_ACTIONS_WIDGET_ROADMAP.md`](../docs/NATIVE_ANDROID_PUSH_ACTIONS_WIDGET_ROADMAP.md).

## První spuštění

1. Zkopírujte `.env.example` jako `.env`.
2. Do `EXPO_PUBLIC_CONVEX_URL` vložte stejnou hodnotu, jakou používá web v `VITE_CONVEX_URL`.
3. Nainstalujte závislosti: `npm install`.
4. Spusťte kontrolu: `npm run typecheck`.
5. Spusťte aplikaci: `npm run android`.

Pro test na fyzickém telefonu lze použít Expo Go. Fotoaparát a GPS se nejlépe ověřují přímo na telefonu.

## Instalační APK

Po odeslání změn na GitHub se automaticky spustí workflow **Android APK**. Hotový soubor `app-debug.apk` je v detailu běhu v sekci **Artifacts** pod názvem `kuryr4you-ridic-apk`. Jde o instalační testovací APK podepsané vývojovým klíčem.

Pro cloudové produkční sestavení přes Expo/EAS po přihlášení spusťte:

```bash
npm install --global eas-cli
eas login
npm run build:apk
```

Profil `preview` vytváří instalační APK. Profil `production` vytváří AAB pro Google Play.

## Rozsah první verze

- přihlášení existujícím účtem řidiče,
- přehled aktivních a volných zakázek,
- přijetí zakázky a změny stavu,
- navigace a telefonní kontakty,
- doklad o doručení s fotografií,
- GPS během otevřené aplikace,
- vendingové návštěvy,
- dostupnost řidiče,
- úprava profilu.

Sledování polohy na pozadí a systémové push notifikace vyžadují samostatnou produkční konfiguraci a nejsou v první testovací APK aktivované.
