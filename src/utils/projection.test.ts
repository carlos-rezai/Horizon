import { describe, it, expect } from 'vitest'
import { findMortgagePayoffMonth, findMilestoneMonth } from './projection'

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

describe('findMilestoneMonth', () => {
  it('returns the first month where an asset account projected balance meets or exceeds the target', () => {
    const id = 'tagesgeld-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 50000),
      snapshot('2026-05', id, 80000),
      snapshot('2026-06', id, 100000),
      snapshot('2026-07', id, 120000),
    ]

    expect(findMilestoneMonth(snapshots, id, 100000, 'Tagesgeld')).toBe('2026-06')
  })

  it('returns null when an asset account never reaches the target', () => {
    const id = 'tagesgeld-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 50000),
      snapshot('2026-05', id, 60000),
      snapshot('2026-06', id, 70000),
    ]

    expect(findMilestoneMonth(snapshots, id, 100000, 'Tagesgeld')).toBeNull()
  })

  it('returns the first month where a Mortgage projected balance falls to or below the target', () => {
    const id = 'mortgage-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 4000000),
      snapshot('2026-05', id, 3500000),
      snapshot('2026-06', id, 3000000),
      snapshot('2026-07', id, 2500000),
    ]

    expect(findMilestoneMonth(snapshots, id, 3000000, 'Mortgage')).toBe('2026-06')
  })

  it('returns null when a Mortgage balance never falls to the target', () => {
    const id = 'mortgage-1'
    const snapshots: MonthlySnapshot[] = [
      snapshot('2026-04', id, 4000000),
      snapshot('2026-05', id, 3800000),
      snapshot('2026-06', id, 3600000),
    ]

    expect(findMilestoneMonth(snapshots, id, 3000000, 'Mortgage')).toBeNull()
  })
})
