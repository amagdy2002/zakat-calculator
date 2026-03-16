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
import { RETIREMENT_ACCOUNT_META, RetirementAccount } from '@/store/modules/retirement.types'

/** Calculate total value for a single retirement account. */
export function getAccountTotal(acc: RetirementAccount): number {
  let val = 0
  if (acc.treatment === 'investment') {
    val = safeCalculate(acc.active) + safeCalculate(acc.passive) + safeCalculate(acc.dividends)
  } else {
    if (acc.isTaxDifferentiated) {
      val = safeCalculate(acc.principal) + safeCalculate(acc.gains)
    } else {
      val = safeCalculate(acc.balance)
    }
  }
  return val + safeCalculate(acc.preciousMetals) + safeCalculate(acc.cash)
}

/** Calculate net zakatable amount for a single retirement account. */
export function getAccountZakatable(acc: RetirementAccount): number {
  const meta = RETIREMENT_ACCOUNT_META[acc.accountType]
  if (meta.isLocked && !acc.isAccessible) return 0
  
  let grossZakatable = 0

  if (acc.treatment === 'investment') {
    const active = safeCalculate(acc.active)
    const passive = safeCalculate(acc.passive)
    const dividends = safeCalculate(acc.dividends)
    grossZakatable = active + (passive * 0.3) + dividends
  } else {
    if (acc.isTaxDifferentiated) {
      grossZakatable = safeCalculate(acc.principal) + safeCalculate(acc.gains)
    } else {
      grossZakatable = safeCalculate(acc.balance)
    }
  }

  // add cash and metals (100% zakatable)
  grossZakatable += safeCalculate(acc.preciousMetals) + safeCalculate(acc.cash)
  
  let netZakatable = grossZakatable
  if (meta.zakatOnNet) {
    if (acc.isTaxDifferentiated) {
       const gains = safeCalculate(acc.gains)
       const taxFactor = (acc.taxRate / 100) + (acc.penaltyRate / 100)
       const taxOnGains = gains * taxFactor
       netZakatable -= taxOnGains
    } else {
       const taxFactor = (acc.taxRate / 100) + (acc.penaltyRate / 100)
       netZakatable *= (1 - taxFactor)
    }
  }
  return Math.max(0, netZakatable)
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
      ? values.retirementAccounts.reduce((sum, acc) => sum + getAccountTotal(acc), 0)
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
      ? values.retirementAccounts.reduce((sum, acc) => sum + getAccountZakatable(acc), 0)
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
      ? values.retirementAccounts.reduce((sum, acc) => sum + getAccountTotal(acc), 0)
      : 0
    const accountsZakatable = Array.isArray(values.retirementAccounts)
      ? values.retirementAccounts.reduce((sum, acc) => sum + getAccountZakatable(acc), 0)
      : 0

    // Calculate totals
    const total = traditionalTotal + rothTotal + pension + otherRetirement + accountsTotal

    // Calculate net amount for accessible funds
    const taxRate = 0.20 // 20% tax
    const penaltyRate = 0.10 // 10% penalty
    const taxAmount = traditionalTotal * taxRate
    const penaltyAmount = traditionalTotal * penaltyRate
    const netAmount = traditionalTotal - taxAmount - penaltyAmount

    // Total zakatable is the net amount of accessible funds plus any withdrawn amounts and per-account components
    const zakatable = hawlMet ? (netAmount + otherZakatable + accountsZakatable) : 0
    const zakatDue = zakatable * ZAKAT_RATE

    // Create breakdown with detailed information
    const items: Record<string, AssetBreakdownItem> = {}

    // Add per-account breakdown if any exist
    if (Array.isArray(values.retirementAccounts)) {
      values.retirementAccounts.forEach((acc, index) => {
        const accTotal = getAccountTotal(acc);
        const accZakatable = getAccountZakatable(acc);
        
        if (accTotal > 0) {
          const typeMeta = RETIREMENT_ACCOUNT_META[acc.accountType];
          items[`account_${acc.id || index}`] = {
            value: accTotal,
            isZakatable: hawlMet,
            zakatable: hawlMet ? accZakatable : 0,
            zakatDue: hawlMet ? accZakatable * ZAKAT_RATE : 0,
            label: acc.name || typeMeta.label,
            tooltip: `Includes net balance + 100% of cash & precious metals. Type: ${typeMeta.label}`
          };
          
          // Also add rows for active, passive, dividends if applicable per the user request
          if (acc.treatment === 'investment') {
            if (acc.active > 0) {
              items[`account_${acc.id || index}_active`] = {
                value: acc.active,
                isZakatable: hawlMet,
                zakatable: hawlMet ? acc.active : 0,
                zakatDue: hawlMet ? acc.active * ZAKAT_RATE : 0,
                label: `  ↳ ${acc.name || typeMeta.label} - Active Trading`,
                tooltip: '100% of Active Trading is zakatable'
              };
            }
            if (acc.passive > 0) {
              items[`account_${acc.id || index}_passive`] = {
                value: acc.passive,
                isZakatable: hawlMet,
                zakatable: hawlMet ? acc.passive * 0.3 : 0,
                zakatDue: hawlMet ? (acc.passive * 0.3) * ZAKAT_RATE : 0,
                label: `  ↳ ${acc.name || typeMeta.label} - Passive Investments`,
                tooltip: '30% of Passive Investments are zakatable'
              };
            }
            if (acc.dividends > 0) {
              items[`account_${acc.id || index}_dividends`] = {
                value: acc.dividends,
                isZakatable: hawlMet,
                zakatable: hawlMet ? acc.dividends : 0,
                zakatDue: hawlMet ? acc.dividends * ZAKAT_RATE : 0,
                label: `  ↳ ${acc.name || typeMeta.label} - Dividends`,
                tooltip: '100% of Dividends are zakatable'
              };
            }
          } else {
             if (acc.isTaxDifferentiated) {
                if (acc.principal > 0) {
                   items[`account_${acc.id || index}_principal`] = {
                    value: acc.principal,
                    isZakatable: hawlMet,
                    zakatable: hawlMet ? (acc.principal * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) : 0,
                    zakatDue: hawlMet ? (acc.principal * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) * ZAKAT_RATE : 0,
                    label: `  ↳ ${acc.name || typeMeta.label} - Principal`,
                    tooltip: 'Principal contribution value'
                  };
                }
                if (acc.gains > 0) {
                  items[`account_${acc.id || index}_gains`] = {
                    value: acc.gains,
                    isZakatable: hawlMet,
                    zakatable: hawlMet ? (acc.gains * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) : 0,
                    zakatDue: hawlMet ? (acc.gains * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) * ZAKAT_RATE : 0,
                    label: `  ↳ ${acc.name || typeMeta.label} - Gains`,
                    tooltip: 'Gains on contribution'
                  };
                }
             } else if (acc.balance > 0) {
                items[`account_${acc.id || index}_balance`] = {
                  value: acc.balance,
                  isZakatable: hawlMet,
                  zakatable: hawlMet ? (acc.balance * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) : 0,
                  zakatDue: hawlMet ? (acc.balance * (typeMeta.zakatOnNet ? (1 - ((acc.taxRate + acc.penaltyRate) / 100)) : 1)) * ZAKAT_RATE : 0,
                  label: `  ↳ ${acc.name || typeMeta.label} - Balance`,
                  tooltip: 'Account balance before cash and metals'
                };
             }
          }
          if (acc.cash > 0) {
             items[`account_${acc.id || index}_cash`] = {
                value: acc.cash,
                isZakatable: hawlMet,
                zakatable: hawlMet ? acc.cash : 0,
                zakatDue: hawlMet ? acc.cash * ZAKAT_RATE : 0,
                label: `  ↳ ${acc.name || typeMeta.label} - Cash`,
                tooltip: 'Cash holdings'
              };
          }
          if (acc.preciousMetals > 0) {
             items[`account_${acc.id || index}_metals`] = {
                value: acc.preciousMetals,
                isZakatable: hawlMet,
                zakatable: hawlMet ? acc.preciousMetals : 0,
                zakatDue: hawlMet ? acc.preciousMetals * ZAKAT_RATE : 0,
                label: `  ↳ ${acc.name || typeMeta.label} - Precious Metals`,
                tooltip: 'Precious metals holdings'
              };
          }
        }
      });
    }

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