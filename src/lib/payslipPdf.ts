// Client-side PDF generation for payslips
// Renders an HTML template via html2canvas → jsPDF image (no font embedding needed)
// Czech diacritics handled natively by the browser

export type PayslipData = {
  // Employee info
  firstName: string
  lastName: string
  position?: string
  contractType?: string
  // Payslip data
  periodMonth: number
  periodYear: number
  hoursWorked?: number
  grossSalary: number
  socialInsurance: number
  healthInsurance: number
  taxBase?: number
  taxCredit?: number
  taxBonus?: number
  taxAdvance: number
  employerSocialIns?: number
  employerHealthIns?: number
  otherDeductions?: number
  otherDeductionsNote?: string
  bonuses?: number
  netSalary: number
  vacationDaysTotal?: number
  vacationDaysTaken?: number
  notes?: string
  status: string
}

export type PayslipTemplate = {
  psCompanyName: string
  psCompanyAddress: string
  psCompanyIco: string
  psCompanyDic: string
  psCompanyPhone: string
  psCompanyEmail: string
  psLogoUrl: string
  psAccentColor: string
  psHeaderNote: string
  psFooterNote: string
  psShowHours: boolean
  psShowSignatureLine: boolean
}

const MONTH_NAMES_CZ = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
]

const CONTRACT_LABELS: Record<string, string> = {
  hpp: 'HPP (Hlavní pracovní poměr)',
  dpp: 'DPP (Dohoda o provedení práce)',
  dpc: 'DPČ (Dohoda o pracovní činnosti)',
  osvc: 'OSVČ',
}

function formatCzk(amount: number): string {
  return amount.toLocaleString('cs-CZ') + ' Kč'
}

// Build an HTML string for a single payslip (794px wide = A4 at 96 dpi)
function buildPayslipHTML(payslip: PayslipData, tmpl: PayslipTemplate): string {
  const accent = tmpl.psAccentColor || '#2563eb'
  const period = `${MONTH_NAMES_CZ[payslip.periodMonth - 1] ?? payslip.periodMonth} ${payslip.periodYear}`

  const totalGross = payslip.grossSalary + (payslip.bonuses || 0)
  const taxBase = payslip.taxBase ?? payslip.grossSalary
  const taxCredit = payslip.taxCredit ?? 2570
  const taxBonus = payslip.taxBonus ?? 0
  const rate = taxBase > 139671 ? 0.23 : 0.15
  const taxBeforeCredit = Math.floor(taxBase * rate)
  const rateLabel = rate === 0.23 ? '23 %' : '15 %'

  const totalEmployeeIns = payslip.socialInsurance + payslip.healthInsurance
  const empSoc = payslip.employerSocialIns ?? 0
  const empHlth = payslip.employerHealthIns ?? 0
  const totalCost = payslip.grossSalary + empSoc + empHlth + (payslip.bonuses || 0)

  // Shared row styles
  const rowStyle = 'display:flex; justify-content:space-between; padding:4px 10px; font-size:11px;'
  const rowStyleAlt = rowStyle + 'background:#f9fafb;'
  const highlightStyle = rowStyle + 'font-weight:bold;'

  function sectionHeader(label: string, color: string) {
    return `<div style="background:${color}; color:white; padding:4px 10px; font-size:9px; font-weight:bold; letter-spacing:0.05em; margin-top:10px;">${label}</div>`
  }

  function row(label: string, value: string, alt = false, bold = false) {
    const base = alt ? rowStyleAlt : rowStyle
    const fw = bold ? 'font-weight:bold;' : ''
    return `<div style="${base}${fw}"><span>${label}</span><span>${value}</span></div>`
  }

  function rowColored(label: string, value: string, color: string, alt = false) {
    const base = alt ? rowStyleAlt : rowStyle
    return `<div style="${base}"><span>${label}</span><span style="color:${color};font-weight:bold;">${value}</span></div>`
  }

  // Earnings rows
  let earningsHTML = row('Základní (hrubá) mzda', formatCzk(payslip.grossSalary), false)
  if (payslip.bonuses) {
    earningsHTML += row('Bonusy / příplatky', formatCzk(payslip.bonuses), true)
    earningsHTML += row('Hrubá mzda celkem', formatCzk(totalGross), false, true)
  }
  if (tmpl.psShowHours && payslip.hoursWorked != null) {
    earningsHTML += row('Odpracováno hodin', `${payslip.hoursWorked} h`, true)
  }

  // Insurance rows
  const insHTML =
    row('Sociální pojištění (7,1 %)', formatCzk(payslip.socialInsurance), false) +
    rowColored('Zdravotní pojištění (4,5 %)', formatCzk(payslip.healthInsurance), '#b91c1c', true) +
    `<div style="${highlightStyle} background:#fee2e2;"><span>Celkem pojištění zaměstnance</span><span style="color:#b91c1c;">${formatCzk(totalEmployeeIns)}</span></div>`

  // Tax rows
  let taxHTML =
    row(`Základ daně (hrubá mzda od 2021)`, formatCzk(taxBase), false) +
    row(`Zálohová daň před slevou (${rateLabel})`, formatCzk(taxBeforeCredit), true) +
    row('Sleva na poplatníka', `− ${formatCzk(taxCredit)}`, false)
  if (taxBonus > 0) {
    taxHTML += row('Daňový bonus', `+ ${formatCzk(taxBonus)}`, true)
  }
  taxHTML += `<div style="${highlightStyle} background:#ede9fe;"><span>Zálohová daň po slevách</span><span style="color:#581c87;">${formatCzk(payslip.taxAdvance)}</span></div>`

  // Other deductions
  const otherHTML = payslip.otherDeductions ? (
    sectionHeader('OSTATNÍ SRÁŽKY', '#78502a') +
    rowColored(
      payslip.otherDeductionsNote ? `Ostatní srážky (${payslip.otherDeductionsNote})` : 'Ostatní srážky',
      formatCzk(payslip.otherDeductions), '#b91c1c'
    )
  ) : ''

  // Employer contributions
  const employerHTML = (empSoc > 0 || empHlth > 0) ? `
    <div style="background:#f0f5fa; border:1px solid #c8d2dc; border-radius:4px; padding:8px 10px; margin-top:8px; font-size:9px; color:#506478;">
      <div style="font-weight:bold; margin-bottom:4px; letter-spacing:0.04em;">NÁKLADY ZAMĚSTNAVATELE (informativně)</div>
      <div style="display:flex; gap:24px;">
        <span>SZ zaměstnavatele (24,8 %): ${formatCzk(empSoc)}</span>
        <span>ZP zaměstnavatele (9 %): ${formatCzk(empHlth)}</span>
        <span style="font-weight:bold;">Celkové náklady: ${formatCzk(totalCost)}</span>
      </div>
    </div>
  ` : ''

  // Vacation
  const vacHTML = (payslip.vacationDaysTotal != null || payslip.vacationDaysTaken != null)
    ? `<div style="font-size:10px; color:#506478; margin-top:8px; padding-left:10px;">Dovolená: čerpáno ${payslip.vacationDaysTaken ?? '?'} dní z ${payslip.vacationDaysTotal ?? '?'} dní nároku</div>`
    : ''

  // Notes
  const notesHTML = payslip.notes
    ? `<div style="font-size:10px; color:#64748b; font-style:italic; margin-top:6px; padding-left:10px;">Poznámka: ${payslip.notes}</div>`
    : ''

  // Header note
  const headerNoteHTML = tmpl.psHeaderNote
    ? `<div style="font-size:10px; color:#64748b; font-style:italic; margin-bottom:10px; padding:0 10px;">${tmpl.psHeaderNote}</div>`
    : ''

  // Footer
  const contacts = [tmpl.psCompanyPhone, tmpl.psCompanyEmail].filter(Boolean).join('  |  ')
  const footerHTML = `
    <div style="border-top:1.5px solid ${accent}; margin-top:16px; padding-top:6px; display:flex; justify-content:space-between; font-size:9px; color:#999;">
      <span>${tmpl.psFooterNote || ''}</span>
      <span>${contacts}</span>
    </div>
  `

  // Signature line
  const signHTML = tmpl.psShowSignatureLine ? `
    <div style="display:flex; justify-content:space-between; margin-top:28px; padding:0 10px;">
      <div style="text-align:center;">
        <div style="border-top:1px solid #bbb; width:160px; margin-bottom:5px;"></div>
        <div style="font-size:10px; color:#888;">Podpis zaměstnavatele</div>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #bbb; width:160px; margin-bottom:5px;"></div>
        <div style="font-size:10px; color:#888;">Podpis zaměstnance</div>
      </div>
    </div>
  ` : ''

  // Company info header
  const companyMeta = [
    tmpl.psCompanyAddress,
    tmpl.psCompanyIco ? `IČO: ${tmpl.psCompanyIco}` : '',
    tmpl.psCompanyDic ? `DIČ: ${tmpl.psCompanyDic}` : ''
  ].filter(Boolean).join('   |   ')

  return `
    <div style="width:794px; min-height:1123px; font-family:Arial,sans-serif; color:#1f2937; background:white; position:relative; box-sizing:border-box;">
      <!-- Header band -->
      <div style="background:${accent}; color:white; padding:14px 24px 12px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="font-size:17px; font-weight:bold;">${tmpl.psCompanyName || 'Firma'}</div>
          <div style="font-size:9px; margin-top:5px; opacity:0.85;">${companyMeta}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; letter-spacing:0.08em;">VÝPLATNÍ PÁSKA</div>
          <div style="font-size:14px; font-weight:bold; margin-top:2px;">${period}</div>
        </div>
      </div>

      <!-- Employee band -->
      <div style="background:#f5f7fa; display:flex; padding:10px 24px 10px; margin-bottom:4px;">
        <div style="flex:1;">
          <div style="font-size:9px; color:#64748b; margin-bottom:3px; letter-spacing:0.06em;">ZAMĚSTNANEC</div>
          <div style="font-size:15px; font-weight:bold; color:#0f172a;">${payslip.firstName} ${payslip.lastName}</div>
          <div style="font-size:10px; color:#374151; margin-top:2px;">${payslip.position || ''}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:9px; color:#64748b; margin-bottom:3px; letter-spacing:0.06em;">PRACOVNÍ POMĚR</div>
          <div style="font-size:11px;">${CONTRACT_LABELS[payslip.contractType ?? ''] ?? (payslip.contractType || '')}</div>
          ${tmpl.psShowHours && payslip.hoursWorked != null ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">Odpracováno: ${payslip.hoursWorked} h</div>` : ''}
        </div>
      </div>

      <div style="padding:10px 14px;">
        ${headerNoteHTML}

        ${sectionHeader('HRUBÉ PŘÍJMY', accent)}
        ${earningsHTML}

        ${sectionHeader('ODVODY ZAMĚSTNANCE (sociální a zdravotní pojištění)', '#b91c1c')}
        <div style="background:#fff8f8;">
          ${insHTML}
        </div>

        ${sectionHeader('VÝPOČET DANĚ Z PŘÍJMU (§ 38h ZDP)', '#6928d9')}
        <div style="background:#faf8ff;">
          ${taxHTML}
        </div>

        ${otherHTML}

        <!-- Net salary box -->
        <div style="background:${accent}; border-radius:5px; padding:12px 16px; margin-top:14px; display:flex; justify-content:space-between; align-items:center; color:white;">
          <div style="font-size:12px; letter-spacing:0.06em;">ČISTÁ MZDA K VÝPLATĚ</div>
          <div style="font-size:18px; font-weight:bold;">${formatCzk(payslip.netSalary)}</div>
        </div>

        ${employerHTML}
        ${vacHTML}
        ${notesHTML}
        ${signHTML}
        ${footerHTML}
      </div>
    </div>
  `
}

export async function generatePayslipPdf(
  payslips: PayslipData[],
  template: PayslipTemplate,
  employeeName: string
): Promise<void> {
  console.log('generatePayslipPdf start (html2canvas approach), count:', payslips.length)

  const { jsPDF } = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default

  console.log('jsPDF loaded, html2canvas loaded')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < payslips.length; i++) {
    const payslip = payslips[i]
    console.log(`Rendering payslip ${i + 1}/${payslips.length}: ${payslip.firstName} ${payslip.lastName}`)

    // Create off-screen element
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.background = 'white'
    container.innerHTML = buildPayslipHTML(payslip, template)
    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      console.log(`Canvas for payslip ${i + 1}: ${canvas.width}x${canvas.height}`)

      if (i > 0) doc.addPage()
      // Fit the image to A4 page (210x297 mm)
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297)
    } finally {
      document.body.removeChild(container)
    }
  }

  // Determine filename
  const firstPayslip = payslips[0]
  const filename = payslips.length === 1
    ? `vyplatni_paska_${employeeName.replace(/\s+/g, '_')}_${firstPayslip.periodYear}_${String(firstPayslip.periodMonth).padStart(2, '0')}.pdf`
    : `vyplatni_pasky_${employeeName.replace(/\s+/g, '_')}.pdf`

  console.log('Saving PDF:', filename)
  doc.save(filename)
  console.log('PDF saved successfully')
}
