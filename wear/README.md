# K4Y Dispečink — aplikace pro Wear OS

Samostatná hodinková aplikace (Kotlin + Compose for Wear OS) zobrazující přehled
dispečinku Kurýr4You: souhrn zakázek, aktivní zakázky s další zastávkou a stavem.

Data čte z dispečerského HTTP API (`/api/v1/dispatch/*`) pomocí API klíče
`k4ai_…`, který se vytváří na webu v sekci **Dispečink → AI přístup**. Klíč se
zadává jednorázově přímo na hodinkách (klávesnicí nebo hlasem) a ukládá se jen
do lokálního úložiště aplikace.

## Instalace na Galaxy Watch (bez počítače)

1. Na **hodinkách** zapni vývojářský režim: Nastavení → O hodinkách → Informace
   o softwaru → 5× klepni na „Verze softwaru". Pak Nastavení → Vývojářské
   možnosti → zapni **Ladění ADB** a **Ladění přes Wi-Fi**.
2. Na **telefonu** nainstaluj z Google Play aplikaci **Wear Installer 2**.
3. Stáhni si do telefonu `kuryr4you-wear.apk` z GitHub release
   [`wear-latest`](https://github.com/peegee1985/macaly-kuryr4-you-dispecink-qxs5v8/releases/tag/wear-latest).
4. Ve Wear Installer 2 zadej IP adresu hodinek (ukazuje ji obrazovka Ladění
   přes Wi-Fi), na hodinkách potvrď autorizaci a vyber stažený APK → Install.
5. Aplikace „K4Y Dispečink" se objeví v seznamu aplikací na hodinkách. Při
   prvním spuštění zadej API klíč.

## Build

CI workflow **Wear OS APK** (`.github/workflows/wear-apk.yml`) sestaví debug
APK při každé změně ve `wear/` a připne ho k release `wear-latest`.

Lokálně: `cd wear && gradle assembleDebug` (vyžaduje Android SDK a JDK 17).
