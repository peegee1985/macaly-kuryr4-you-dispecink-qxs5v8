# Vending Operations Management — Plán implementace

## Přehled

Do platformy Kuryr4You přidáme kompletní modul **Vending Operations Management** — profesionální systém pro správu servisních lokací (automaty, parcel lockery, atd.). Modul se přirozeně integruje do existující platformy a sdílí design, autentizaci a infrastrukturu.

Celý modul bude pod novou URL sekcí `/vending` pro dispečery a `/ridic/vending` pro řidiče. Zákazníci budou mít vlastní oddělený dashboard.

---

## Architektura (co se vytvoří)

### Nové databázové tabulky (Convex)

| Tabulka | Popis |
|---|---|
| `serviceLocations` | Servisní lokace (automaty, lockery…) — master entita |
| `serviceVisits` | Návštěvy — plánované i dokončené |
| `visitChecklistTemplates` | Konfigurovatelné šablony checklistů |
| `visitChecklistItems` | Položky šablony checklistu |
| `visitChecklists` | Vyplněné checklisty per návštěva |
| `visitPhotos` | Fotodokumentace s GPS + timestamp |
| `visitIncidents` | Hlášení incidentů |
| `visitTimeline` | Časová osa každé návštěvy |
| `serviceClients` | Klientské workspace (multi-tenant) |
| `serviceClientUsers` | Přiřazení uživatelů ke klientům |
| `auditLog` | Auditní log všech změn |

### Nové role uživatelů

Rozšíříme existující role o:
- `vending_supervisor` — správce klienta (vidí jen svůj workspace)
- `service_driver` — technik/řidič pro servis

*(Admin a Dispatcher zůstávají stávající role)*

### Nové trasy (Routes)

**Dispečer / Admin:**
- `/vending` — Přehled vending modulu
- `/vending/lokace` — Seznam a správa lokací
- `/vending/lokace/$locationId` — Detail lokace + timeline
- `/vending/mapa` — Interaktivní mapa s live statusy
- `/vending/navstevy` — Správa návštěv + plánování
- `/vending/navstevy/$visitId` — Detail návštěvy + timeline
- `/vending/incidenty` — Přehled incidentů
- `/vending/klienti` — Správa klientů / workspace
- `/vending/sablony` — Editor checklistů
- `/vending/kpi` — KPI dashboard + grafy
- `/vending/nastaveni` — Nastavení modulu

**Řidič (servisní technik):**
- `/ridic/vending` — Seznam přidělených návštěv dnes
- `/ridic/vending/$visitId` — Workflow: Start → Checklist → Foto → Dokončení

**Zákazník (vending supervisor):**
- `/zakaznik/vending` — Dashboard s mapou, KPI a statusy strojů
- `/zakaznik/vending/$locationId` — Detail lokace + historie

---

## Fáze implementace

### Fáze 1 — Databáze & Backend (Convex)
- Rozšíření `schema.ts` o všechny nové tabulky
- `convex/vending.ts` — CRUD pro lokace, návštěvy, checklisty
- `convex/vendingClients.ts` — správa workspace
- `convex/vendingKpi.ts` — KPI výpočty
- Bezpečnostní pravidla (izolace klientů)

### Fáze 2 — Dispečer: Lokace & Mapa
- Seznam lokací s filtry a vyhledáváním
- CRUD formulář lokace (všechna pole ze zadání)
- Interaktivní mapa (Leaflet, stavové barvy)
- Postranní panel po kliknutí na lokaci

### Fáze 3 — Dispečer: Návštěvy & Incidenty
- Plánování a přiřazování návštěv
- Detail návštěvy s timeline
- Správa incidentů + notifikace
- Šablony checklistů (editor)

### Fáze 4 — Řidič: Mobilní workflow
- Přehled dnešních návštěv
- Start Visit + GPS verifikace
- Interaktivní checklist
- Upload fotek (před/po/škoda)
- Hlášení incidentu
- Podpis zákazníka
- Tlačítka navigace (Google Maps / Apple Maps / Waze)

### Fáze 5 — Zákazník: Dashboard & KPI
- Live mapa s jeho stroji
- KPI grafy (Recharts — již nainstalováno)
- Přehled návštěv a incidentů
- Detail lokace + kompletní historie

### Fáze 6 — Reporty & Notifikace
- PDF report po dokončení návštěvy (html2canvas, již funguje)
- Email automatika po dokončení
- Konfigurovatelné email šablony

---

## Co se NEBUDE dělat v tomto rozsahu

- ❌ Offline synchronizace (PWA cache) — pouze základní responzivita
- ❌ Multi-language (CZ/SK/EN) — pouze čeština (dle požadavků projektu)
- ❌ Route optimization s AI — pouze vizualizace na mapě + Google Maps odkaz
- ❌ Stripe platby pro vending (žádné platby)
- ❌ Vlastní branding per zákazník (logo/barvy) — standardní tmavý design

---

## Checklist

- [ ] Rozšíření Convex schématu (nové tabulky)
- [ ] Backend funkce (CRUD + bezpečnost)
- [ ] `/vending` — Přehled a navigace dispečera
- [ ] `/vending/lokace` — Správa lokací (tabulka + CRUD)
- [ ] `/vending/mapa` — Interaktivní mapa
- [ ] `/vending/navstevy` — Správa návštěv
- [ ] `/vending/incidenty` — Incidenty
- [ ] `/vending/sablony` — Šablony checklistů
- [ ] `/vending/kpi` — KPI dashboard
- [ ] `/vending/klienti` — Klienti/workspace
- [ ] `/ridic/vending` — Mobilní přehled řidiče
- [ ] `/ridic/vending/$visitId` — Visit workflow
- [ ] `/zakaznik/vending` — Zákaznický dashboard
- [ ] Notifikace (email + in-app) při incidentu
- [ ] PDF report po dokončení
- [ ] Deploy Convex
