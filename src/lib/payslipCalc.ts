// Utility functions for payslip calculations — Czech law 2025
// Extracted for testability (no React/Convex dependencies)

// ── Tax rates 2025 (zákon č. 586/1992 Sb.) ──────────────────────────────────
export const RATES_2025 = {
  /** Sociální pojištění — zaměstnanec */
  socialEmployee: 0.071,
  /** Zdravotní pojištění — zaměstnanec */
  healthEmployee: 0.045,
  /** Sociální pojištění — zaměstnavatel */
  socialEmployer: 0.248,
  /** Zdravotní pojištění — zaměstnavatel */
  healthEmployer: 0.09,
  /** Základní sazba daně */
  taxLow: 0.15,
  /** Vyšší sazba daně (nad 139 671 Kč/měs.) */
  taxHigh: 0.23,
  /** Hranice pro vyšší sazbu daně (Kč/měs.) */
  taxHighThreshold: 139671,
  /** Sleva na poplatníka (Kč/měs.) */
  defaultTaxCredit: 2570,
}

export type CalcInput = {
  grossSalary: number
  bonuses: number
  otherDeductions: number
  taxCredit: number
  taxBonus: number
}

export type CalcResult = {
  socialInsurance: number
  healthInsurance: number
  taxBase: number
  taxBeforeCredit: number
  taxAdvance: number
  employerSocialIns: number
  employerHealthIns: number
  netSalary: number
}

/**
 * Vypočítá všechny položky výplatního lístku dle sazeb 2025.
 * Vrací zaokrouhlené hodnoty v Kč.
 */
export function calcAll2025(input: CalcInput): CalcResult {
  const { grossSalary: gross, bonuses: bonus, otherDeductions: other, taxCredit: credit, taxBonus: taxBonusVal } = input

  // Odvody zaměstnance
  const socialInsurance = Math.round(gross * RATES_2025.socialEmployee)
  const healthInsurance = Math.round(gross * RATES_2025.healthEmployee)

  // Odvody zaměstnavatele (informativně)
  const employerSocialIns = Math.round(gross * RATES_2025.socialEmployer)
  const employerHealthIns = Math.round(gross * RATES_2025.healthEmployer)

  // Základ daně = hrubá mzda (od 2021, superhrubá zrušena)
  const taxBase = gross

  // Záloha na daň: 15% nebo 23% nad 139 671 Kč/měs.
  const rate = gross > RATES_2025.taxHighThreshold ? RATES_2025.taxHigh : RATES_2025.taxLow
  const taxBeforeCredit = Math.floor(taxBase * rate)

  // Záloha na daň po slevě a daňovém bonusu
  const taxAdvance = Math.max(0, taxBeforeCredit - credit) - taxBonusVal

  // Čistá mzda
  const netSalary = Math.max(0, Math.round(gross + bonus - socialInsurance - healthInsurance - Math.max(0, taxAdvance) - other))

  return {
    socialInsurance,
    healthInsurance,
    taxBase,
    taxBeforeCredit,
    taxAdvance: Math.max(0, taxAdvance),
    employerSocialIns,
    employerHealthIns,
    netSalary,
  }
}

// ── CSV helpers ──────────────────────────────────────────────────────────────

export type PayslipCsvRow = {
  periodMonth: string
  periodYear: string
  hoursWorked: string
  grossSalary: string
  socialInsurance: string
  healthInsurance: string
  taxAdvance: string
  bonuses: string
  otherDeductions: string
  otherDeductionsNote: string
  netSalary: string
  notes: string
  taxBase: string
  taxCredit: string
  taxBonus: string
  employerSocialIns: string
  employerHealthIns: string
  vacationDaysTotal: string
  vacationDaysTaken: string
}

/**
 * Parsuje CSV text (středník jako oddělovač) na pole výplatních lístků.
 * Automaticky přeskočí řádek s hlavičkou.
 */
export function parsePayslipsCsv(text: string): PayslipCsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const dataLines = lines[0].toLowerCase().includes('měs') || lines[0].toLowerCase().includes('m')
    ? lines.slice(1)
    : lines
  return dataLines.filter(l => l.trim()).map((line) => {
    const cols = line.split(';').map(c => c.trim().replace(/^"(.*)"$/, '$1'))
    return {
      periodMonth: cols[0] || String(new Date().getMonth() + 1),
      periodYear: cols[1] || String(new Date().getFullYear()),
      hoursWorked: cols[2] || '',
      grossSalary: cols[3] || '',
      socialInsurance: cols[4] || '',
      healthInsurance: cols[5] || '',
      taxAdvance: cols[6] || '',
      bonuses: cols[7] || '',
      otherDeductions: cols[8] || '',
      otherDeductionsNote: cols[9] || '',
      netSalary: cols[10] || '',
      notes: cols[11] || '',
      // Nová pole — výchozí hodnoty pro importované řádky
      taxBase: '',
      taxCredit: String(RATES_2025.defaultTaxCredit),
      taxBonus: '0',
      employerSocialIns: '',
      employerHealthIns: '',
      vacationDaysTotal: '',
      vacationDaysTaken: '',
    }
  })
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formátuje číslo jako Kč částku (česká lokalizace).
 */
export function formatCzk(amount: number): string {
  return amount.toLocaleString('cs-CZ') + ' Kč'
}
