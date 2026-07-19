# Implementační mapa

## Convex

| Oblast | Doporučené umístění | Poznámka |
|---|---|---|
| Tabulky a indexy | `convex/schema.ts` | Použij názvy ze specifikace |
| XP engine | `convex/gamification.ts` | Interní funkce pro award, level, badge a challenge progress |
| Výzvy a periody | `convex/gamificationChallenges.ts` | Generování, adaptivní targety, dokončení a expirace |
| Admin operace | `convex/gamificationAdmin.ts` | Oprávnění, povinný důvod, audit |
| Query řidiče | `convex/gamificationQueries.ts` | Vlastní profil a výzvy pouze přihlášeného řidiče |
| Integrace zakázky | stávající ride/order mutace | Udělit XP až po ověřené změně stavu |
| Integrace POD | stávající POD mutace | Samostatný idempotentní event |
| Integrace vending | stávající visit mutace | Návštěva a checklist jako oddělené eventy |

Názvy souborů lze přizpůsobit stávající konvenci repozitáře, ale oddělení odpovědností a serverová pravidla musí zůstat zachována.

## Řidičská Android aplikace (`mobile/`)

- Přidej lokální gamifikační datovou vrstvu/hooky napojené na Convex query.
- Přidej kartu na Home, obrazovku Výzvy, kabinet badge, detail badge a level-up modal.
- Assety převeď ze SVG sprite na lokální `react-native-svg` komponenty nebo bezpečný lokální loader.
- Push notifikace navazuj na existující Expo notifications infrastrukturu.
- Cache smí zobrazit poslední známý stav offline, ale nesmí lokálně přičítat XP.

## Webový dispečink (`src/`)

- Rozšiř detail řidiče o gamifikační tab.
- Přidej auditní tabulku a administraci šablon.
- Ovládací prvky respektují role a nikdy nejsou dostupné zákazníkovi.
- Použij stávající Tailwind tokeny a fonty Exo 2 / Nunito Sans.

## Sdílené kontrakty

- Typ události a `eventKey` jsou stabilní API kontrakt.
- Hodnoty XP a limitů se nesmí duplikovat v klientských souborech.
- UI získává již vypočtený level, progress a následující threshold ze serveru.
- Feature flagy: `gamificationEnabled`, `seasonLeaderboardEnabled`, `realRewardsEnabled`.
- Výchozí hodnoty: `true`, `false`, `false`.

## Migrace

1. Přidat nové tabulky a indexy bez změny existujících dokumentů.
2. Nasadit backend query a lazy vytvoření profilu.
3. Zapnout čtení v klientovi.
4. Zapojit award eventy po jednom integračním bodu.
5. Zapnout aktivní výzvy.
6. Backfill ponechat jako samostatnou admin akci s dry-run; implicitně jej nespouštět.

