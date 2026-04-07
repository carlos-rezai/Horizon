import { describe, it, expect } from 'vitest'
import { findMortgagePayoffMonth } from './projection'

interface AccountSnapshot {
  projected: number
  actual?: number
}

interface MonthlySnapshot {
  month: string
  accounts: Record<string, AccountSnapshot>
  netCashflow: number
  totalLiquid: number
}

const snapshot = (month: string, accountId: string, projected: number): MonthlySnapshot => ({
  month,
  accounts: { [accountId]: { projected } },
  netCashflow: 0,
  totalLiquid: 0,
})

describe('findMortgagePayoffMonth', () => {
  it('returns the first month where the projected balance reaches zero', () => {
    const id = 'mortgage-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 400000),
      snapshot('2026-05', id, 200000),
      snapshot('2026-06', id, 0),
      snapshot('2026-07', id, -50000),
    ]

    expect(findMortgagePayoffMonth(snapshots, id)).toBe('2026-06')
  })

  it('returns the first month that crosses zero, not a later one', () => {
    const id = 'mortgage-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 300000),
      snapshot('2026-05', id, 100000),
      snapshot('2026-06', id, -10000),
      snapshot('2026-07', id, -200000),
    ]

    expect(findMortgagePayoffMonth(snapshots, id)).toBe('2026-06')
  })

  it('returns null when the balance never reaches zero', () => {
    const id = 'mortgage-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 400000),
      snapshot('2026-05', id, 350000),
      snapshot('2026-06', id, 300000),
    ]

    expect(findMortgagePayoffMonth(snapshots, id)).toBeNull()
  })

  it('returns null when snapshots array is empty', () => {
    expect(findMortgagePayoffMonth([], 'mortgage-1')).toBeNull()
  })
})
