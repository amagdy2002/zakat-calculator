/**
 * Cash Calculator - Calculates Zakat on all liquid cash assets
 * - Aggregates all cash values (cash on hand, checking, savings, digital wallets, foreign currency)
 * - Bank accounts can be added individually by name and balance
 * - All cash is considered zakatable at full value if hawl is met
 * - Applies standard 2.5% Zakat rate on total cash holdings
 * - Provides detailed breakdown of each cash category
 */
import { AssetType, AssetBreakdown, AssetBreakdownItem, ZAKAT_RATE, safeCalculate } from './types'
import { formatCurrency } from '@/lib/utils/currency'

interface BankAccountEntry {
  id: string
  name: string
  balance: number
}

interface CashValues {
  [key: string]: number | BankAccountEntry[] | unknown
  bank_accounts?: BankAccountEntry[]
}

const ARRAY_FIELDS = new Set(['foreign_currency_entries', 'bank_accounts'])

export const cash: AssetType = {
  id: 'cash',
  name: 'Cash & Bank',
  color: '#7C3AED', // Purple

  calculateTotal: (values: CashValues) => {
    // Sum scalar numeric fields
    const scalarTotal = Object.entries(values).reduce((sum, [key, value]) => {
      if (ARRAY_FIELDS.has(key) || typeof value !== 'number') return sum
      return sum + safeCalculate(value)
    }, 0)

    // Sum bank account balances
    const bankTotal = (values.bank_accounts || []).reduce(
      (sum: number, acc: BankAccountEntry) => sum + safeCalculate(acc.balance),
      0
    )

    return scalarTotal + bankTotal
  },

  calculateZakatable: (values: CashValues, _prices: undefined, hawlMet: boolean) => {
    if (!hawlMet) return 0
    return cash.calculateTotal(values)
  },

  getBreakdown: (values: CashValues, _prices: undefined, hawlMet: boolean, currency: string = 'USD'): AssetBreakdown => {
    // Scalar fields
    const items = Object.entries(values).reduce((acc, [key, value]) => {
      if (ARRAY_FIELDS.has(key) || typeof value !== 'number') return acc

      const safeValue = safeCalculate(value)
      const zakatable = hawlMet ? safeValue : 0
      const zakatDue = hawlMet ? safeValue * ZAKAT_RATE : 0

      return {
        ...acc,
        [key]: {
          value: safeValue,
          isZakatable: hawlMet,
          zakatable,
          zakatDue,
          label: key.split('_').map((word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          tooltip: hawlMet
            ? `Full amount is zakatable: ${formatCurrency(safeValue, currency)}`
            : 'Hawl period not met yet'
        }
      }
    }, {} as Record<string, AssetBreakdownItem>)

    // Bank account entries as individual breakdown items
    ;(values.bank_accounts || []).forEach((acc: BankAccountEntry) => {
      const safeValue = safeCalculate(acc.balance)
      const zakatable = hawlMet ? safeValue : 0
      const zakatDue = hawlMet ? safeValue * ZAKAT_RATE : 0
      items[`bank_account_${acc.id}`] = {
        value: safeValue,
        isZakatable: hawlMet,
        zakatable,
        zakatDue,
        label: acc.name || 'Bank Account',
        tooltip: hawlMet
          ? `Full amount is zakatable: ${formatCurrency(safeValue, currency)}`
          : 'Hawl period not met yet'
      }
    })

    const total = cash.calculateTotal(values)
    const zakatable = cash.calculateZakatable(values, undefined, hawlMet)
    const zakatDue = zakatable * ZAKAT_RATE

    return {
      total,
      zakatable,
      zakatDue,
      items
    }
  }
}