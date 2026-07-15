import { v } from "convex/values"
import { action } from "./_generated/server"

const COMPETITOR_KNOWLEDGE = `
## Tržní ceníky kurýrní přepravy Praha (2025)

### Messenger Praha / CityExpress (platné od 1.12.2025):
- Malá zásilka (obálka, dokument): nástup 95 Kč + 24 Kč/km
- Velká zásilka (balík): nástup 119 Kč + 24 Kč/km
- Vyzvednutí zásilky: nástup 249 Kč + 26 Kč/km
- Dodávka / van: nástup 499 Kč + 48 Kč/km
- Same Day expresní: standardní sazba −30 % (rychlejší = levnější pro zákazníka)

### eKuryr Praha:
- Zásilka do 450 kg: nástup 155 Kč + 14 Kč/km
- Zásilka do 1000 kg (palety): nástup 390 Kč + 19,5 Kč/km
- Expres příplatek: +50 % na všechno

### Mesik.cz Praha:
- Auto / dodávka EXPRESS Praha: nástup 105–145 Kč + 31–36 Kč/km
- Urgentní / večerní příplatek: +30–50 %

### Obecná tržní úroveň Praha:
- Motocykl / kolo (do 5 kg): nástup 104,50 Kč + 22 Kč/km, min. 149 Kč
- Osobní auto (do 30 kg): nástup 129,80 Kč + 24,20 Kč/km
- Same-day příplatek (trh): +25 %
- Večerní / víkendový příplatek: +30–50 %

## Odhad vzdáleností v Praze (přímá trasa; reálná silniční ~1,3×):
- V rámci jedné čtvrti (Praha 1–10 centrum): 2–5 km
- Sousední pražské čtvrti: 5–10 km
- Přes centrum (z jednoho okraje na druhý): 10–15 km
- Okraj Prahy ↔ centrum: 12–20 km
- Celá Praha (periferie na periferii): 18–30 km
- Praha + příměstské oblasti (Říčany, Kladno, Beroun apod.): 25–50 km
- Pokud je vyzvednutí mimo Prahu a jede se zpět do Prahy nebo jinam, počítej i cestu z Prahy jako z výchozí pozice
`

const SYSTEM_PROMPT = `Jsi AI asistent pro nacenění kurýrních zásilek společnosti Kuryr4You v Praze.
Máš přístup k aktuálním ceníkům konkurence a znáš pražské prostředí.

${COMPETITOR_KNOWLEDGE}

## Tvůj úkol:
1. Z předaných detailů zásilky odhadni vzdálenost na základě adres (zohledni pražské čtvrti, okraje vs. centrum)
2. Urči vhodný typ vozidla dle zásilky (obálka = motocykl, malý balík = auto, velký/těžký = dodávka)
3. Spočítej orientační cenu pro každého konkurenta
4. Navrhni **optimální cenu pro Kuryr4You** — konkurenceschopnou, ale s přiměřenou marží (~15–25 % nad cenou konkurence)
5. Zohledni urgenci: same-day = +25 %, expres (do 2 hod.) = +40 %, noční / víkend = +50 %
6. Zaokrouhli výsledek na desítky Kč

## Výstupní formát (VÝHRADNĚ platný JSON, žádný jiný text):
{
  "doporucenaCena": <číslo v Kč>,
  "odhadnutaVzdalenost": "<X–Y km>",
  "typVozidla": "<motocykl|osobní auto|dodávka>",
  "urgence": "<standardní|same-day|expres|noční>",
  "zduvodneni": "<2–4 věty česky vysvětlující návrh ceny>",
  "konkurence": [
    { "firma": "Messenger Praha", "cena": <číslo> },
    { "firma": "eKuryr", "cena": <číslo> },
    { "firma": "Mesik.cz", "cena": <číslo> }
  ]
}

Odpovídej VÝHRADNĚ v češtině a VÝHRADNĚ jako JSON.`

export const suggestPrice = action({
  args: {
    pickupAddress: v.string(),
    deliveryAddress: v.string(),
    cargoType: v.string(),
    cargoDescription: v.string(),
    weight: v.optional(v.number()),
    quantity: v.number(),
    notes: v.optional(v.string()),
    requestedPickupAt: v.number(),
    requestedDeliveryAt: v.number(),
    isMultiStop: v.optional(v.boolean()),
    stopCount: v.optional(v.number()),
  },
  returns: v.object({
    doporucenaCena: v.number(),
    odhadnutaVzdalenost: v.string(),
    typVozidla: v.string(),
    urgence: v.string(),
    zduvodneni: v.string(),
    konkurence: v.array(v.object({
      firma: v.string(),
      cena: v.number(),
    })),
  }),
  handler: async (_ctx, args) => {
    const baseUrl = process.env.MACALY_BASE_URL
    const apiToken = process.env.MACALY_API_TOKEN
    const chatId = process.env.MACALY_CHAT_ID
    const bypassHeader = process.env.MACALY_BYPASS_HEADER

    if (!baseUrl || !apiToken || !chatId) {
      throw new Error("LLM konfigurace není dostupná")
    }

    const cargoLabels: Record<string, string> = {
      envelope: "obálka / dokument",
      parcel: "malý balík",
      box: "krabice / větší balík",
      pallet: "paleta / těžká zásilka",
      other: "jiný typ zásilky",
    }

    const now = Date.now()
    const pickupDate = new Date(args.requestedPickupAt)
    const deliveryDate = new Date(args.requestedDeliveryAt)
    const hoursDiff = (args.requestedDeliveryAt - args.requestedPickupAt) / (1000 * 60 * 60)
    const daysUntilPickup = (args.requestedPickupAt - now) / (1000 * 60 * 60 * 24)

    const userMessage = `
Nacej prosím tuto zásilku:

**Vyzvednutí:** ${args.pickupAddress}
**Doručení:** ${args.deliveryAddress}
**Typ zásilky:** ${cargoLabels[args.cargoType] ?? args.cargoType}
**Popis:** ${args.cargoDescription}
${args.weight ? `**Hmotnost:** ${args.weight} kg` : ""}
**Počet kusů:** ${args.quantity}
${args.isMultiStop && args.stopCount ? `**Multi-stop:** ano (${args.stopCount} zastávek)` : ""}
${args.notes ? `**Poznámka zákazníka:** ${args.notes}` : ""}

**Požadované vyzvednutí:** ${pickupDate.toLocaleString("cs-CZ")}
**Požadované doručení:** ${deliveryDate.toLocaleString("cs-CZ")}
**Časové okno doručení:** ${hoursDiff < 2 ? "expres (do 2 hodin)" : hoursDiff < 6 ? "same-day (tentýž den)" : "standardní"}
**Zásilka platná od:** ${daysUntilPickup < 0 ? "okamžitě / zpětně" : daysUntilPickup < 0.5 ? "do několika hodin" : "v budoucnu"}
`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiToken}`,
    }
    if (bypassHeader) {
      const [headerName, ...rest] = bypassHeader.split(": ")
      if (headerName && rest.length > 0) {
        headers[headerName] = rest.join(": ")
      }
    }

    const response = await fetch(`${baseUrl}/api/client-app/llm-usage`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chatId,
        preset: "FAST",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[AI Pricing] LLM error:", err)
      throw new Error(`LLM chyba: ${response.status}`)
    }

    const data = await response.json() as { success: boolean; text: string }
    if (!data.success) throw new Error("LLM nevrátil výsledek")

    console.log("[AI Pricing] Raw response:", data.text)

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = data.text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonText = jsonMatch[1].trim()
    // Also handle responses that start with { directly
    const startIdx = jsonText.indexOf("{")
    if (startIdx > 0) jsonText = jsonText.slice(startIdx)
    const endIdx = jsonText.lastIndexOf("}")
    if (endIdx >= 0) jsonText = jsonText.slice(0, endIdx + 1)

    const result = JSON.parse(jsonText)
    console.log("[AI Pricing] Parsed result:", result)

    return {
      doporucenaCena: Number(result.doporucenaCena) || 0,
      odhadnutaVzdalenost: String(result.odhadnutaVzdalenost || "?"),
      typVozidla: String(result.typVozidla || "?"),
      urgence: String(result.urgence || "standardní"),
      zduvodneni: String(result.zduvodneni || ""),
      konkurence: Array.isArray(result.konkurence) ? result.konkurence.map((k: { firma: string; cena: number }) => ({
        firma: String(k.firma),
        cena: Number(k.cena) || 0,
      })) : [],
    }
  },
})
