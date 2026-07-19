# Kuryr4You – gamifikace řidičské aplikace

## 1. Cíl a pravidla

Gamifikace má zvyšovat spolehlivost, kvalitu POD, dochvilnost a pravidelné používání aplikace. Nesmí odměňovat rychlou nebo riskantní jízdu.

- Řidič vidí vlastní XP, úroveň, výzvy a odznaky.
- Dispečer vidí gamifikaci všech řidičů, může udělit ruční ocenění a kontrolovat historii.
- Zákazník gamifikační údaje nikdy nevidí.
- XP a postup se počítají pouze na serveru z ověřených událostí.
- Lifetime XP se nikdy nemaže; měsíční sezonní XP se resetuje.
- Neúspěch neodečítá již získané XP, ale může přerušit streak nebo nesplnit výzvu.

## 2. XP ekonomika

| Událost | XP | Omezení |
|---|---:|---|
| Dokončená zakázka | 100 | Jednou za zakázku |
| Kompletní POD | 15 | Fotografie nebo podpis, nejvýše jednou |
| Fotografie i podpis | +5 | Bonus za kompletní dokumentaci |
| Vyzvednutí včas | 15 | Podle časového okna zakázky |
| Doručení včas | 25 | Podle časového okna zakázky |
| Mezizastávka | 10 | Max. 50 XP na jednu trasu |
| Hodnocení 5/5 | 20 | Pouze skutečné zákaznické hodnocení |
| Dokončená vending návštěva | 80 | Jednou za návštěvu |
| Kompletní vending checklist | 20 | Bez přeskočených povinných bodů |
| Dokončená denní výzva | 50–150 | Podle obtížnosti |
| Dokončená týdenní výzva | 250–600 | Podle obtížnosti |
| Dokončená měsíční výzva | 800–2 000 | Podle obtížnosti |

Žádné XP za maximální nebo průměrnou rychlost. GPS se hodnotí pouze jako dostupnost polohy během aktivní směny.

## 3. Úrovně

Požadované celkové XP pro úroveň `L`: `250 × (L - 1)²`.

| Úroveň | Minimální XP | Titul |
|---:|---:|---|
| 1 | 0 | Nováček |
| 3 | 1 000 | Aktivní kurýr |
| 5 | 4 000 | Kurýr v tempu |
| 8 | 12 250 | Spolehlivý kurýr |
| 10 | 20 250 | Zkušený kurýr |
| 15 | 49 000 | Mistr tras |
| 20 | 90 250 | Elitní kurýr |
| 30 | 210 250 | Legenda K4Y |

První verze odemyká tituly, rámečky profilu a odznaky. Finanční odměny nebo přednostní přidělování zakázek se nemají automatizovat bez samostatného obchodního rozhodnutí.

## 4. Výzvy

### Denní

- Dokonči 1–3 zakázky podle skutečně přiděleného objemu.
- Ulož kompletní POD u všech dnešních doručení.
- Dodrž všechny časové sloty.
- Měj GPS dostupnou alespoň 90 % aktivní směny.
- Dokonči všechny povinné vending checklisty.

Každý řidič dostane maximálně tři výzvy, které jsou reálně splnitelné podle jeho přidělené práce.

### Týdenní

- Spolehlivý týden: alespoň 95 % zakázek včas.
- POD profesionál: 100 % zakázek s dokladem.
- Mistr tras: dokonči stanovený počet vícezastávkových tras.
- Série: aktivita alespoň pět různých dní.
- Bez reklamace: žádná potvrzená oprávněná reklamace.

### Měsíční

- 25/50/100 dokončených zakázek podle vytížení řidiče.
- Alespoň 95 % včasných doručení při minimálně 20 zakázkách.
- Průměrné hodnocení alespoň 4,8 při minimálně 10 hodnoceních.
- 98 % úspěšně dokončených zakázek.
- Kompletní POD alespoň u 95 % doručení.

### Dlouhodobé milníky

- 1, 10, 50, 100, 250, 500 a 1 000 doručení.
- 100, 1 000, 5 000 a 10 000 km zaznamenaných během aktivních zakázek.
- 7, 30, 90, 180 a 365 aktivních dní.
- 10, 50 a 200 vícezastávkových tras.
- 50, 250 a 1 000 kompletních POD.

## 5. Odznaky

Odznak může mít bronzovou, stříbrnou, zlatou a platinovou variantu.

1. První zásilka
2. Vždy včas
3. POD profesionál
4. Mistr vícezastávkových tras
5. Spolehlivý partner
6. Strážce GPS
7. Oblíbenec zákazníků
8. Kilometrový hrdina
9. Týmový hráč
10. Perfektní týden
11. 250 doručení
12. Legenda K4Y

## 6. Obrazovky

- Domovská obrazovka: kompaktní karta levelu, XP progress a nejbližší denní výzva.
- Nová záložka **Výzvy**: denní/týdenní/měsíční úkoly, streak, statistiky a kabinet odznaků.
- Detail odznaku: podmínka, aktuální postup, datum získání a další tier.
- Level-up modal: animace, nový titul a právě odemčené prvky.
- Dispečer – detail řidiče: level, lifetime XP, sezonní XP, aktivní výzvy, odznaky a auditní historie.
- Dispečer – správa: aktivace šablon výzev, ruční ocenění a případná oprava chybného záznamu s povinným důvodem.

## 7. Convex datový model

- `driverGamificationProfiles`: `driverId`, `lifetimeXp`, `level`, `seasonXp`, `currentStreak`, `longestStreak`, `lastActiveDate`, `updatedAt`; index `by_driver`.
- `gamificationEvents`: `driverId`, `eventKey`, `type`, `xp`, `rideId?`, `visitId?`, `occurredAt`, `metadata?`; indexy `by_driver_time`, `by_event_key`.
- `challengeTemplates`: `code`, `name`, `description`, `cadence`, `metric`, `target`, `xpReward`, `badgeCode?`, `minimumWorkload?`, `active`, `validFrom?`, `validTo?`.
- `driverChallenges`: `driverId`, `templateId`, `periodKey`, `progress`, `target`, `status`, `xpReward`, `startsAt`, `expiresAt`, `completedAt?`, `claimedAt?`; indexy `by_driver_period`, `by_status`.
- `badgeDefinitions`: `code`, `name`, `description`, `category`, `tier`, `iconKey`, `criteria`, `active`.
- `driverBadges`: `driverId`, `badgeCode`, `tier`, `awardedAt`, `sourceEventKey`; indexy `by_driver`, `by_driver_badge`.
- `gamificationSeasons`: `key`, `name`, `startsAt`, `endsAt`, `status`.

## 8. Serverové zpracování

1. Ověřená doménová událost proběhne v Convexu, například `submitPOD` nebo `completeVisit`.
2. Backend vytvoří idempotentní `gamificationEvent`.
3. Jedna transakce zvýší lifetime i season XP a přepočítá level.
4. Stejná událost aktualizuje relevantní aktivní výzvy.
5. Engine zkontroluje nové odznaky a vyšší tier.
6. Řidič dostane in-app/Android oznámení o dokončené výzvě nebo level-upu.

Denní výzvy se přidělují po známém rozpisu práce nebo při první přidělené zakázce. Týdenní perioda začíná v pondělí a všechny časové výpočty používají `Europe/Prague`.

## 9. Ochrana proti zneužití

- Klient nikdy neposílá počet XP; posílá pouze běžnou pracovní akci.
- Každé ocenění má auditní událost a idempotentní klíč.
- Nelze opakovaně získat XP změnou statusu tam a zpět.
- GPS body se počítají jen během aktivní směny a s filtrem nereálných skoků.
- Výzvy založené na počtu zakázek se přizpůsobují přidělenému objemu.
- Žebříčky kvality vyžadují minimální počet zakázek.
- Interní reklamace nebo storna nesmějí automaticky trestat řidiče bez potvrzení dispečerem.

## 10. Implementační fáze

1. MVP: datový model, XP ledger, levely, základní XP, obrazovka Výzvy, 12 badge a read-only dispečerský přehled.
2. Aktivní výzvy: denní/týdenní/měsíční šablony, adaptivní cíle, streaky, level-up modal, oznámení a správa šablon.
3. Sezony: měsíční season XP, interní žebříček, ruční ocenění a analytika dopadu.
4. Odměny: volitelné benefity, rozpočet, právní posouzení a A/B vyhodnocení.

