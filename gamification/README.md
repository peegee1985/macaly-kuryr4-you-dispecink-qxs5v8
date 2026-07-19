# Kuryr4You Gamification Kit

Tento adresář je jediný zdroj pravdy pro implementaci gamifikace řidičské aplikace Kuryr4You.

## Pro Macaly.ai

Začni souborem [`MACALY_IMPLEMENTATION_PROMPT.md`](./MACALY_IMPLEMENTATION_PROMPT.md) a postupuj přesně v uvedeném pořadí. Neimplementuj gamifikaci pouze podle tohoto README.

## Obsah

| Soubor | Účel |
|---|---|
| `MACALY_IMPLEMENTATION_PROMPT.md` | Kompletní implementační zadání pro Macaly.ai |
| `GAMIFICATION_SPEC.md` | Produktová a provozní specifikace |
| `IMPLEMENTATION_MAP.md` | Mapování funkcí na Convex, web a Android aplikaci |
| `data/gamification.config.json` | Strojově čitelná XP ekonomika, levely, výzvy a odznaky |
| `data/design-tokens.json` | Barvy, rozměry, typografie a animace |
| `data/asset-manifest.json` | Přesné mapování assetů a SVG symbolů |
| `assets/badge-sprite.svg` | Vektorové rámečky tierů a 12 ikon odznaků |
| `assets/gamification-ui.svg` | Vektorové UI prvky pro XP, streak, level-up a prázdné stavy |
| `QA_CHECKLIST.md` | Akceptační kritéria a regresní testy |

## Neměnné zásady

- Zákazník nikdy nevidí gamifikační údaje.
- Za rychlost, maximální rychlost ani zkrácení času jízdy se neudělují XP.
- XP vznikají pouze na serveru z ověřených doménových událostí.
- Každá XP událost musí být idempotentní a auditovatelná.
- Lifetime XP se nemaže; sezonní XP se resetuje po měsíci.
- Neúspěch neodečítá již získané XP.

## Integrace assetů

SVG soubory jsou sprity. Pro odznak vykresli tier frame a ikonu přes sebe ve stejném `viewBox="0 0 128 128"`. Web může použít SVG `<use>`. React Native má použít `react-native-svg` a načíst stejné cesty/symboly podle `asset-manifest.json`; pokud externí fragmenty nejsou v daném bundleru podporované, převeď symboly při implementaci na lokální React komponenty bez změny jejich geometrie nebo barev.

