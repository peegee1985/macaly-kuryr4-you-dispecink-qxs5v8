// Client-side PDF generation for Vending Visit Reports
// Renders HTML via html2canvas → jsPDF (same approach as payslipPdf.ts)
// Czech diacritics handled natively by the browser

export type VendingReportData = {
  visitNumber: string
  status: string
  scheduledAt: number
  arrivedAt?: number | null
  startedAt?: number | null
  completedAt?: number | null
  driverNotes?: string | null
  dispatcherNotes?: string | null
  signatureUrl?: string | null
  location?: {
    name: string
    address: string
    locationType?: string
    locationCode?: string
    openingHours?: string | null
    accessInstructions?: string | null
  } | null
  driver?: {
    name?: string | null
    email: string
  } | null
  checklist?: {
    items: Array<{ text: string; completed: boolean; textValue?: string | null }>
    completedAt?: number | null
  } | null
  photos?: Array<{
    category: string
    caption?: string | null
    url?: string | null
  }>
  incidents?: Array<{
    type: string
    severity: string
    description: string
    status: string
    resolutionNote?: string | null
  }>
  clientName?: string
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen', pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj', broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty', wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu', vandalism: 'Vandalismus', other: 'Jiný',
}

const PHOTO_CATEGORY_LABEL: Record<string, string> = {
  before: 'Před servisem', after: 'Po servisu', damage: 'Poškození', other: 'Ostatní',
}

function fmt(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

function duration(a?: number | null, b?: number | null): string {
  if (!a || !b) return '—'
  const mins = Math.round((b - a) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)} h ${mins % 60} min`
}

function buildReportHTML(data: VendingReportData): string {
  const accent = '#1e40af'
  const green = '#16a34a'
  const red = '#dc2626'

  const checklistDone = data.checklist
    ? data.checklist.items.filter((i) => i.completed).length
    : 0
  const checklistTotal = data.checklist?.items.length ?? 0

  const photosByCategory = (data.photos ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  const openIncidents = (data.incidents ?? []).filter((i) => i.status !== 'resolved')
  const resolvedIncidents = (data.incidents ?? []).filter((i) => i.status === 'resolved')

  // --- checklist rows ---
  const checklistRows = data.checklist
    ? data.checklist.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : 'white'}">
        <td style="padding:6px 10px; font-size:11px; color:${item.completed ? green : red}; width:20px; text-align:center;">
          ${item.completed ? '✓' : '✗'}
        </td>
        <td style="padding:6px 10px; font-size:11px; color:#1f2937;">${item.text}</td>
        <td style="padding:6px 10px; font-size:11px; color:#6b7280;">${item.textValue ?? ''}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:10px; font-size:11px; color:#9ca3af; text-align:center;">Bez checklistu</td></tr>'

  // --- incident rows ---
  const incidentRows = (data.incidents ?? []).length === 0
    ? '<tr><td colspan="3" style="padding:10px; font-size:11px; color:#9ca3af; text-align:center;">Žádné incidenty</td></tr>'
    : (data.incidents ?? []).map((inc, i) => `
      <tr style="background:${i % 2 === 0 ? '#fef2f2' : 'white'}">
        <td style="padding:6px 10px; font-size:11px; color:#1f2937;">${INCIDENT_TYPE_LABEL[inc.type] ?? inc.type}</td>
        <td style="padding:6px 10px; font-size:11px; color:${inc.severity === 'high' ? red : inc.severity === 'medium' ? '#d97706' : '#2563eb'};">
          ${inc.severity === 'high' ? 'Vysoká' : inc.severity === 'medium' ? 'Střední' : 'Nízká'}
        </td>
        <td style="padding:6px 10px; font-size:11px; color:#374151;">${inc.description}</td>
      </tr>`).join('')

  // --- photo summary ---
  const photoSummaryRows = Object.entries(photosByCategory).map(([cat, count]) =>
    `<span style="display:inline-block; margin-right:12px; font-size:11px; color:#374151;">
      <strong>${count}×</strong> ${PHOTO_CATEGORY_LABEL[cat] ?? cat}
    </span>`
  ).join('') || '<span style="font-size:11px; color:#9ca3af;">Žádné fotografie</span>'

  return `
    <div style="width:794px; min-height:1123px; font-family:Arial,sans-serif; color:#1f2937; background:white; box-sizing:border-box;">

      <!-- Header -->
      <div style="background:${accent}; color:white; padding:16px 28px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="font-size:9px; letter-spacing:0.1em; opacity:0.75; margin-bottom:4px;">SERVISNÍ REPORT</div>
          <div style="font-size:20px; font-weight:bold;">${data.visitNumber}</div>
          ${data.clientName ? `<div style="font-size:11px; margin-top:4px; opacity:0.85;">${data.clientName}</div>` : ''}
        </div>
        <div style="text-align:right; font-size:11px; opacity:0.85;">
          <div>Plánováno: ${fmt(data.scheduledAt)}</div>
          <div style="margin-top:2px;">Dokončeno: ${fmt(data.completedAt)}</div>
        </div>
      </div>

      <div style="padding:18px 28px;">

        <!-- Location + Driver row -->
        <div style="display:flex; gap:16px; margin-bottom:16px;">
          <div style="flex:1; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
            <div style="font-size:8px; color:#6b7280; letter-spacing:0.08em; margin-bottom:6px;">LOKACE</div>
            <div style="font-size:14px; font-weight:bold; color:#1f2937; margin-bottom:2px;">${data.location?.name ?? '—'}</div>
            <div style="font-size:11px; color:#374151;">${data.location?.address ?? '—'}</div>
            ${data.location?.locationType ? `<div style="font-size:10px; color:#6b7280; margin-top:4px;">${data.location.locationType}</div>` : ''}
            ${data.location?.locationCode ? `<div style="font-size:10px; color:#2563eb; margin-top:2px; font-family:monospace;">${data.location.locationCode}</div>` : ''}
            ${data.location?.openingHours ? `<div style="font-size:10px; color:#6b7280; margin-top:4px;">⏰ ${data.location.openingHours}</div>` : ''}
          </div>
          <div style="flex:1; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
            <div style="font-size:8px; color:#6b7280; letter-spacing:0.08em; margin-bottom:6px;">SERVISNÍ TECHNIK</div>
            <div style="font-size:14px; font-weight:bold; color:#1f2937;">${data.driver ? (data.driver.name ?? data.driver.email) : 'Nepřiřazeno'}</div>
          </div>
        </div>

        <!-- Times row -->
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          ${[
            ['Plánovaný příjezd', fmt(data.scheduledAt)],
            ['Skutečný příjezd', fmtTime(data.arrivedAt)],
            ['Zahájení', fmtTime(data.startedAt)],
            ['Dokončení', fmtTime(data.completedAt)],
            ['Trvání servis', duration(data.startedAt, data.completedAt)],
          ].map(([label, value]) => `
            <div style="flex:1; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:8px 10px; text-align:center;">
              <div style="font-size:8px; color:#6b7280; margin-bottom:4px;">${label}</div>
              <div style="font-size:12px; font-weight:bold; color:#1f2937;">${value}</div>
            </div>`).join('')}
        </div>

        <!-- Summary badges -->
        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <div style="padding:6px 14px; border-radius:20px; font-size:11px; font-weight:bold;
            background:${checklistTotal > 0 && checklistDone === checklistTotal ? '#dcfce7' : '#fef9c3'};
            color:${checklistTotal > 0 && checklistDone === checklistTotal ? green : '#854d0e'}; border:1px solid transparent;">
            ✓ Checklist ${checklistDone}/${checklistTotal}
          </div>
          <div style="padding:6px 14px; border-radius:20px; font-size:11px; font-weight:bold;
            background:#dbeafe; color:#1e40af; border:1px solid transparent;">
            📷 ${(data.photos ?? []).length} fotografií
          </div>
          ${(data.incidents ?? []).length > 0 ? `
          <div style="padding:6px 14px; border-radius:20px; font-size:11px; font-weight:bold;
            background:#fee2e2; color:${red}; border:1px solid transparent;">
            ⚠ ${openIncidents.length} otevřených incidentů
          </div>` : `
          <div style="padding:6px 14px; border-radius:20px; font-size:11px; font-weight:bold;
            background:#dcfce7; color:${green}; border:1px solid transparent;">
            ✓ Bez incidentů
          </div>`}
        </div>

        <!-- Checklist -->
        <div style="margin-bottom:16px;">
          <div style="font-size:9px; font-weight:bold; letter-spacing:0.1em; color:#374151; background:#f3f4f6; padding:6px 10px; border-radius:4px 4px 0 0; text-transform:uppercase;">
            Checklist
          </div>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-top:none;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left; width:20px;"></th>
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left;">Položka</th>
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left; width:160px;">Hodnota / poznámka</th>
              </tr>
            </thead>
            <tbody>${checklistRows}</tbody>
          </table>
        </div>

        <!-- Photos summary -->
        <div style="margin-bottom:16px; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
          <div style="font-size:9px; font-weight:bold; letter-spacing:0.1em; color:#374151; text-transform:uppercase; margin-bottom:8px;">Fotodokumentace</div>
          <div>${photoSummaryRows}</div>
        </div>

        <!-- Incidents -->
        <div style="margin-bottom:16px;">
          <div style="font-size:9px; font-weight:bold; letter-spacing:0.1em; color:#374151; background:#f3f4f6; padding:6px 10px; border-radius:4px 4px 0 0; text-transform:uppercase;">
            Incidenty
          </div>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-top:none;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left;">Typ</th>
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left; width:80px;">Závažnost</th>
                <th style="padding:5px 10px; font-size:9px; color:#6b7280; text-align:left;">Popis</th>
              </tr>
            </thead>
            <tbody>${incidentRows}</tbody>
          </table>
        </div>

        <!-- Notes -->
        ${data.driverNotes ? `
        <div style="margin-bottom:12px; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
          <div style="font-size:9px; color:#6b7280; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px;">Poznámky technika</div>
          <div style="font-size:11px; color:#374151;">${data.driverNotes}</div>
        </div>` : ''}

        ${data.dispatcherNotes ? `
        <div style="margin-bottom:12px; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
          <div style="font-size:9px; color:#6b7280; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px;">Poznámky dispečera</div>
          <div style="font-size:11px; color:#374151;">${data.dispatcherNotes}</div>
        </div>` : ''}

        <!-- Signature -->
        ${data.signatureUrl ? `
        <div style="margin-bottom:12px; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
          <div style="font-size:9px; color:#6b7280; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px;">Podpis zákazníka</div>
          <img src="${data.signatureUrl}" style="max-height:60px; background:#f9fafb; border-radius:4px; display:block;" alt="Podpis" />
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:2px solid ${accent}; padding-top:8px; display:flex; justify-content:space-between; font-size:9px; color:#9ca3af; margin-top:16px;">
          <span>Kurýr4You — Servisní report</span>
          <span>Generováno: ${new Date().toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>

      </div>
    </div>
  `
}

export async function generateVendingReportPdf(data: VendingReportData): Promise<void> {
  console.log('generateVendingReportPdf start, visit:', data.visitNumber)

  const { jsPDF } = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.background = 'white'
  container.innerHTML = buildReportHTML(data)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    console.log(`Canvas: ${canvas.width}x${canvas.height}`)
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297)
  } finally {
    document.body.removeChild(container)
  }

  const filename = `servisni_report_${data.visitNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  console.log('Saving PDF:', filename)
  doc.save(filename)
  console.log('PDF saved')
}
