/**
 * Retirement Calculator - Calculates Zakat on retirement accounts
 * - 401(k) accounts: Only withdrawable amount is zakatable (after tax and penalties)
 * - IRAs: If accessible (over 59½), full amount is zakatable; otherwise net after penalties
 * - Roth accounts: Full amount of contributions is zakatable
 * - Employer match: Only vested portions are considered for Zakat
 * - Accounts are zakatable if hawl requirement is met
 * - Applies standard 2.5% Zakat rate on zakatable amounts
 */
import { AssetType, AssetBreakdown, AssetBreakdownItem, ZAKAT_RATE, safeCalculate } from './types'
import { formatCurrency } from '@/lib/utils/currency'
import { RetirementValues } from '@/store/types'
import { RETIREMENT_ACCOUNT_META } from '@/store/modules/retirement.types'

/** Calculate net withdrawable amount for a single retirement account. */
function netWithdrawable(balance: number, taxRate: number, penaltyRate: number, zakatOnNet: boolean): number {
  if (!zakatOnNet) return balance
  const net = balance * (1 - taxRate / 100 - penaltyRate / 100)
  return Math.max(0, net)
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RetirementPrices {
  // No additional prices needed for retirement accounts
}

export const retirement: AssetType = {
  id: 'retirement',
  name: 'Retirement Accounts',
  color: '#0EA5E9', // Sky color

  calculateTotal: (values: RetirementValues): number => {
    if (!values) return 0

    const traditional401k = safeCalculate(values.traditional_401k)
    const traditionalIRA = safeCalculate(values.traditional_ira)
    const roth401k = safeCalculate(values.roth_401k)
    const rothIRA = safeCalculate(values.roth_ira)
    const pension = safeCalculate(values.pension)
    const otherRetirement = safeCalculate(values.other_retirement)

    const accountsTotal = Array.isArray(values.retirementAccounts)
      ? values.retirementAccounts.reduce((sum, acc) => sum + safeCalculate(acc.balance), 0)
      : 0

    return traditional401k + traditionalIRA + roth401k + rothIRA + pension + otherRetirement + accountsTotal
  },

  calculateZakatable: (values: RetirementValues, _prices: undefined, hawlMet: boolean): number => {
    if (!values || !hawlMet) return 0

    // Only accessible funds (traditional accounts) and withdrawn amounts are zakatable
    // Pension is exempt (locked funds)
    const traditional401k = safeCalculate(values.traditional_401k)
    const traditionalIRA = safeCalculate(values.traditional_ira)
    const traditionalTotal = traditional401k + traditionalIRA

    // Calculate net amount after tax and penalties
    const taxRate = 0.20 // 20% tax
    const penaltyRate = 0.10 // 10% penalty
    const taxAmount = traditionalTotal * taxRate
    const penaltyAmount = traditionalTotal * penaltyRate
    const netAmount = traditionalTotal - taxAmount - penaltyAmount

    // Other retirement is already net amount
    const otherRetirement = safeCalculate(values.other_retirement)

    // Per-account zakatable: locked accounts are deferred
    const accountsZakatable = Array.isArray(values.retirementAccounts)
      ? values.retirementAccounts.reduce((sum, acc) => {
        const meta = RETIREMENT_ACCOUNT_META[acc.accountType]
        if (meta.isLocked && !acc.isAccessible) return sum
        const bal = safeCalculate(acc.balance)
        const net = netWithdrawable(bal, acc.taxRate, acc.penaltyRate, meta.zakatOnNet)
        return sum + net
      }, 0)
      : 0

    return hawlMet ? (netAmount + otherRetirement + accountsZakatable) : 0
  },

  getBreakdown: (values: RetirementValues, _prices: undefined, hawlMet: boolean): AssetBreakdown => {
    if (!values) {
      return {
        total: 0,
        zakatable: 0,
        zakatDue: 0,
        items: {
          retirement_accounts: {
            value: 0,
            isZakatable: false,
            zakatable: 0,
            zakatDue: 0,
            label: 'Retirement Accounts',
            tooltip: 'No retirement accounts added yet',
            isExempt: false
          }
        }
      }
    }

    // Traditional accounts (accessible funds)
    const traditional401k = safeCalculate(values.traditional_401k)
    const traditionalIRA = safeCalculate(values.traditional_ira)
    const traditionalTotal = traditional401k + traditionalIRA
    const traditionalZakatable = hawlMet ? traditionalTotal : 0
    const traditionalZakatDue = traditionalZakatable * ZAKAT_RATE

    // Roth accounts
    const roth401k = safeCalculate(values.roth_401k)
    const rothIRA = safeCalculate(values.roth_ira)
    const rothTotal = roth401k + rothIRA
    const rothZakatable = 0 // Roth accounts are exempt
    const rothZakatDue = 0

    // Pension (locked funds)
    const pension = safeCalculate(values.pension)
    const pensionZakatable = 0 // Pension is exempt as it's locked
    const pensionZakatDue = 0

    // Other retirement (withdrawn amounts)
    const otherRetirement = safeCalculate(values.other_retirement)
    const otherZakatable = hawlMet ? otherRetirement : 0
    const otherZakatDue = otherZakatable * ZAKAT_RATE

    // Per-account breakdown
    const accountsTotal = Array.isArray(values.retirementAccounts)
      ? values.retirementAccounts.reduce((sum, acc) => sum + safeCalculate(acc.balance), 0)
      : 0
    const accountsZakatable = Array.isArray(values.retirementAccounts)
      ? values.retirementAccounts.reduce((sum, acc) => {
        const meta = RETIREMENT_ACCOUNT_META[acc.accountType]
        if (meta.isLocked && !acc.isAccessible) return sum
        const bal = safeCalculate(acc.balance)
        return sum + netWithdrawable(bal, acc.taxRate, acc.penaltyRate, meta.zakatOnNet)
      }, 0)
      : 0

    // Calculate totals
    const total = traditionalTotal + rothTotal + pension + otherRetirement + accountsTotal

    // Calculate net amount for accessible funds
    const taxRate = 0.20 // 20% tax
    const penaltyRate = 0.10 // 10% penalty
    const taxAmount = traditionalTotal * taxRate
    const penaltyAmount = traditionalTotal * penaltyRate
    const netAmount = traditionalTotal - taxAmount - penaltyAmount

    // Total zakatable is the net amount of accessible funds plus any withdrawn amounts
    const zakatable = hawlMet ? (netAmount + otherZakatable + accountsZakatable) : 0
    const zakatDue = zakatable * ZAKAT_RATE

    // Create breakdown with detailed information
    const items: Record<string, AssetBreakdownItem> = {}

    // Always add traditional accounts, even if zero
    items.traditional_accounts = {
      value: traditionalTotal,
      isZakatable: hawlMet,
      zakatable: netAmount,
      zakatDue: netAmount * ZAKAT_RATE,
      label: 'Accessible Funds',
      tooltip: traditionalTotal > 0
        ? 'Gross amount before taxes and penalties. Zakat is due on net amount after deductions.'
        : 'No accessible funds added yet',
      isExempt: false
    }

    // Always add pension, even if zero
    items.pension = {
      value: pension,
      isZakatable: false,
      zakatable: 0,
      zakatDue: 0,
      label: 'Locked Funds',
      tooltip: pension > 0
        ? 'Funds are locked until retirement - Zakat is deferred'
        : 'No locked funds added yet',
      isExempt: true
    }

    return {
      total,
      zakatable,
      zakatDue,
      items
    }
  }
} 