import { describe, it, expect } from 'vitest'
import {
  calcAll2025,
  parsePayslipsCsv,
  formatCzk,
  RATES_2025,
} from '@/lib/payslipCalc'

// ── calcAll2025 ──────────────────────────────────────────────────────────────

describe('calcAll2025()', () => {
  const BASE_INPUT = {
    grossSalary: 30000,
    bonuses: 0,
    otherDeductions: 0,
    taxCredit: RATES_2025.defaultTaxCredit, // 2 570
    taxBonus: 0,
  }

  it('vypočítá sociální pojištění zaměstnance (7,1 %)', () => {
    const result = calcAll2025(BASE_INPUT)
    expect(result.socialInsurance).toBe(Math.round(30000 * 0.071)) // 2 130
  })

  it('vypočítá zdravotní pojištění zaměstnance (4,5 %)', () => {
    const result = calcAll2025(BASE_INPUT)
    expect(result.healthInsurance).toBe(Math.round(30000 * 0.045)) // 1 350
  })

  it('základ daně = hrubá mzda (superhrubá zrušena od 2021)', () => {
    const result = calcAll2025(BASE_INPUT)
    expect(result.taxBase).toBe(30000)
  })

  it('záloha na daň: 15 % při hrubé ≤ 139 671 Kč', () => {
    const result = calcAll2025(BASE_INPUT)
    const taxBeforeCredit = Math.floor(30000 * 0.15) // 4 500
    const expected = Math.max(0, taxBeforeCredit - RATES_2025.defaultTaxCredit) // 4 500 - 2 570 = 1 930
    expect(result.taxAdvance).toBe(expected)
  })

  it('záloha na daň: 23 % při hrubé > 139 671 Kč', () => {
    const result = calcAll2025({ ...BASE_INPUT, grossSalary: 150000 })
    const taxBeforeCredit = Math.floor(150000 * 0.23) // 34 500
    const expected = Math.max(0, taxBeforeCredit - RATES_2025.defaultTaxCredit) // 34 500 - 2 570 = 31 930
    expect(result.taxAdvance).toBe(expected)
  })

  it('zohledňuje daňový bonus (snižuje zálohu na daň)', () => {
    const result = calcAll2025({ ...BASE_INPUT, taxBonus: 1000 })
    const taxBeforeCredit = Math.floor(30000 * 0.15) // 4 500
    const expectedAdvance = Math.max(0, Math.max(0, taxBeforeCredit - 2570) - 1000) // 930
    expect(result.taxAdvance).toBe(expectedAdvance)
  })

  it('záloha na daň není záporná (daňový bonus nesmí jít do minusu)', () => {
    // Nízká hrubá + vysoký bonus → záloha = 0
    const result = calcAll2025({ ...BASE_INPUT, grossSalary: 5000, taxBonus: 500 })
    expect(result.taxAdvance).toBeGreaterThanOrEqual(0)
  })

  it('vypočítá odvody zaměstnavatele (SZ 24,8 %, ZP 9 %)', () => {
    const result = calcAll2025(BASE_INPUT)
    expect(result.employerSocialIns).toBe(Math.round(30000 * 0.248)) // 7 440
    expect(result.employerHealthIns).toBe(Math.round(30000 * 0.09))  // 2 700
  })

  it('vypočítá čistou mzdu správně', () => {
    const result = calcAll2025(BASE_INPUT)
    const expected = 30000 - result.socialInsurance - result.healthInsurance - result.taxAdvance
    expect(result.netSalary).toBe(Math.max(0, Math.round(expected)))
  })

  it('zahrnuje bonusy do čisté mzdy', () => {
    const bez = calcAll2025(BASE_INPUT)
    const s = calcAll2025({ ...BASE_INPUT, bonuses: 2000 })
    expect(s.netSalary).toBe(bez.netSalary + 2000)
  })

  it('odečítá ostatní srážky od čisté mzdy', () => {
    const bez = calcAll2025(BASE_INPUT)
    const s = calcAll2025({ ...BASE_INPUT, otherDeductions: 1000 })
    expect(s.netSalary).toBe(bez.netSalary - 1000)
  })

  it('čistá mzda není záporná', () => {
    const result = calcAll2025({ ...BASE_INPUT, grossSalary: 1000, otherDeductions: 99999 })
    expect(result.netSalary).toBe(0)
  })

  it('nulová hrubá mzda → vše nula', () => {
    const result = calcAll2025({ ...BASE_INPUT, grossSalary: 0 })
    expect(result.socialInsurance).toBe(0)
    expect(result.healthInsurance).toBe(0)
    expect(result.taxAdvance).toBe(0)
    expect(result.netSalary).toBe(0)
  })

  // Konkrétní příklad — hrubá 40 000 Kč, sleva 2 570, bez bonusů
  it('konkrétní příklad: hrubá 40 000 Kč', () => {
    const result = calcAll2025({ grossSalary: 40000, bonuses: 0, otherDeductions: 0, taxCredit: 2570, taxBonus: 0 })
    expect(result.socialInsurance).toBe(2840)        // Math.round(40000 * 0.071)
    expect(result.healthInsurance).toBe(1800)        // Math.round(40000 * 0.045)
    expect(result.taxBeforeCredit).toBe(6000)        // Math.floor(40000 * 0.15)
    expect(result.taxAdvance).toBe(3430)             // 6000 - 2570
    expect(result.employerSocialIns).toBe(9920)      // Math.round(40000 * 0.248)
    expect(result.employerHealthIns).toBe(3600)      // Math.round(40000 * 0.09)
    expect(result.netSalary).toBe(40000 - 2840 - 1800 - 3430) // 31 930
  })
})

// ── parsePayslipsCsv ─────────────────────────────────────────────────────────

describe('parsePayslipsCsv()', () => {
  const HEADER = 'Měsíc;Rok;Hodiny;Hrubá mzda;Sociální;Zdravotní;Záloha na daň;Bonusy;Ostatní srážky;Popis srážek;Čistá mzda;Poznámka'
  const ROW = '6;2025;168;35000;2485;1575;2680;0;;;29260;Testovací'

  it('parsuje jeden řádek s hlavičkou', () => {
    const rows = parsePayslipsCsv(`${HEADER}\n${ROW}`)
    expect(rows).toHaveLength(1)
    expect(rows[0].periodMonth).toBe('6')
    expect(rows[0].periodYear).toBe('2025')
    expect(rows[0].grossSalary).toBe('35000')
    expect(rows[0].netSalary).toBe('29260')
    expect(rows[0].notes).toBe('Testovací')
  })

  it('parsuje více řádků', () => {
    const csv = `${HEADER}\n${ROW}\n1;2025;168;35000;2485;1575;2680;0;;;29260;`
    const rows = parsePayslipsCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('přeskočí prázdné řádky', () => {
    const csv = `${HEADER}\n${ROW}\n\n   `
    const rows = parsePayslipsCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('vrátí prázdné pole pro text s méně než 2 řádky', () => {
    expect(parsePayslipsCsv('')).toHaveLength(0)
    expect(parsePayslipsCsv('jeden radek')).toHaveLength(0)
  })

  it('nastaví výchozí taxCredit = 2570', () => {
    const rows = parsePayslipsCsv(`${HEADER}\n${ROW}`)
    expect(rows[0].taxCredit).toBe('2570')
  })

  it('nastaví výchozí taxBonus = 0', () => {
    const rows = parsePayslipsCsv(`${HEADER}\n${ROW}`)
    expect(rows[0].taxBonus).toBe('0')
  })

  it('nastaví taxBase, employerSocialIns, employerHealthIns jako prázdné', () => {
    const rows = parsePayslipsCsv(`${HEADER}\n${ROW}`)
    expect(rows[0].taxBase).toBe('')
    expect(rows[0].employerSocialIns).toBe('')
    expect(rows[0].employerHealthIns).toBe('')
  })

  it('ořeže bílé znaky a odstraní uvozovky z hodnot', () => {
    const csv = `${HEADER}\n 6 ; 2025 ;"168";35000;2485;1575;2680;0;;;29260;`
    const rows = parsePayslipsCsv(csv)
    expect(rows[0].hoursWorked).toBe('168')
    expect(rows[0].periodMonth).toBe('6')
  })

  it('funguje s Windows CRLF', () => {
    const csv = `${HEADER}\r\n${ROW}\r\n`
    const rows = parsePayslipsCsv(csv)
    expect(rows).toHaveLength(1)
  })
})

// ── formatCzk ────────────────────────────────────────────────────────────────

describe('formatCzk()', () => {
  it('formátuje celá čísla s Kč', () => {
    const result = formatCzk(30000)
    expect(result).toContain('Kč')
    expect(result).toContain('30')
  })

  it('formátuje nulu', () => {
    expect(formatCzk(0)).toBe('0 Kč')
  })

  it('formátuje velká čísla', () => {
    const result = formatCzk(1000000)
    expect(result).toContain('Kč')
    expect(result).toContain('1')
  })
})
