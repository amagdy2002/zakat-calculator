import { AssetType, AssetBreakdown, AssetBreakdownItem, ZAKAT_RATE, safeCalculate } from './types'

const PASSIVE_FUND_RATE = 0.3 // 30% rule for passive funds

/**
 * Stocks Calculator - Calculates Zakat on various investment assets
 * - Active trading stocks: 100% of market value is zakatable if hawl is met
 * - Passive investments: Zakatable amount varies based on selected calculation method
 * - Dividends: 100% of earnings are zakatable if hawl is met
 * - Investment funds: 100% of value for active funds, partial for passive funds
 * - Different calculation methods for passive investments: market value, 25% rule, or purification method
 * - Applies standard 2.5% Zakat rate on zakatable amounts
 */

// Stock-specific interfaces
export interface StockHolding {
  symbol: string
  shares: number
  currentPrice: number
  marketValue: number
  zakatDue: number
  lastUpdated?: string
}

export interface StockAccount {
  id: string
  name: string
  active: number          // active trading value — 100% zakatable
  passive: number         // passive/long-term value — 30% zakatable
  dividends: number       // dividend earnings — 100% zakatable
  preciousMetals: number  // physical precious metals held — 100% zakatable
  cash: number            // cash holdings in this account — 100% zakatable
}

export interface StockValues {
  // Active Trading
  activeStocks: StockHolding[]

  // Passive Investments
  passiveInvestments?: {
    version: string
    method: 'quick' | 'detailed'
    investments: Array<{
      id: string
      name: string
      shares: number
      pricePerShare: number
      marketValue: number
    }>
    marketValue: number
    zakatableValue: number
    hawlStatus: {
      isComplete: boolean
      startDate?: string
      endDate?: string
    }
    displayProperties: {
      currency: string
      method: string
      totalLabel: string
    }
  }

  // Per-account input
  stockAccounts?: StockAccount[]

  // Legacy fields (maintained for backward compatibility)
  total_dividend_earnings?: number
  fund_value?: number
  is_passive_fund?: boolean
  market_value: number
  zakatable_value: number
}

export interface StockPrices {
  prices: Record<string, number>
  lastUpdated?: Date
  currency?: string
}

export const stocks: AssetType = {
  id: 'stocks',
  name: 'Stocks & Investments',
  color: '#10B981', // Emerald color

  calculateTotal: (values: StockValues): number => {
    if (!values) return 0

    // Active Trading Stocks - Use marketValue which is already calculated
    const activeValue = Array.isArray(values.activeStocks)
      ? values.activeStocks.reduce((sum, stock) =>
        sum + (Number.isFinite(stock.marketValue) ? stock.marketValue : 0), 0)
      : 0

    // Passive Investments - Use stored marketValue
    const passiveValue = values.passiveInvestments && Number.isFinite(values.passiveInvestments.marketValue)
      ? values.passiveInvestments.marketValue
      : 0

    // Dividends - Use safe calculation
    const dividendValue = safeCalculate(values.total_dividend_earnings)

    // Investment Funds - Use safe calculation
    const fundValue = safeCalculate(values.fund_value)

    // Per-account totals
    const accountsTotal = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) =>
        sum + safeCalculate(acc.active) + safeCalculate(acc.passive) + safeCalculate(acc.dividends) + safeCalculate(acc.preciousMetals) + safeCalculate(acc.cash), 0)
      : 0

    // Return total, ensuring it's a valid number
    const total = activeValue + passiveValue + dividendValue + fundValue + accountsTotal
    return Number.isFinite(total) ? total : 0
  },

  calculateZakatable: (values: StockValues, _prices: StockPrices | undefined, hawlMet: boolean): number => {
    if (!values || !hawlMet) return 0

    // Active Trading Stocks - Full amount is zakatable
    const activeValue = Array.isArray(values.activeStocks)
      ? values.activeStocks.reduce((sum, stock) =>
        sum + (Number.isFinite(stock.marketValue) ? stock.marketValue : 0), 0)
      : 0
    const activeZakatable = hawlMet ? activeValue : 0

    // Passive Investments - Use stored zakatable value
    const passiveZakatable = hawlMet && values.passiveInvestments?.zakatableValue
      ? values.passiveInvestments.zakatableValue
      : 0

    // Dividends - Full amount is zakatable
    const dividendValue = safeCalculate(values.total_dividend_earnings)
    const dividendZakatable = hawlMet ? dividendValue : 0

    // Investment Funds - Apply 30% rule for passive funds
    const fundValue = safeCalculate(values.fund_value)
    const fundZakatable = hawlMet
      ? (values.is_passive_fund ? fundValue * PASSIVE_FUND_RATE : fundValue)
      : 0

    // Per-account zakatable: active=100%, passive=30%, dividends=100%, preciousMetals=100%, cash=100%
    const accountsZakatable = hawlMet && Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) =>
        sum +
        safeCalculate(acc.active) +
        safeCalculate(acc.passive) * PASSIVE_FUND_RATE +
        safeCalculate(acc.dividends) +
        safeCalculate(acc.preciousMetals) +
        safeCalculate(acc.cash), 0)
      : 0

    // Return total zakatable amount, ensuring it's a valid number
    const total = activeZakatable + passiveZakatable + dividendZakatable + fundZakatable + accountsZakatable
    return Number.isFinite(total) ? total : 0
  },

  getBreakdown: (values: StockValues, _prices: StockPrices | undefined, hawlMet: boolean): AssetBreakdown => {
    if (!values) {
      return {
        total: 0,
        zakatable: 0,
        zakatDue: 0,
        items: {}
      }
    }

    // Active Trading Stocks - Calculate from activeStocks array
    const activeValue = (values.activeStocks || []).reduce((sum, stock) =>
      sum + stock.marketValue, 0)
    const activeZakatable = hawlMet ? activeValue : 0
    const activeZakatDue = activeZakatable * ZAKAT_RATE

    // Passive Investments - Use values directly from passiveInvestments state
    const passiveValue = values.passiveInvestments?.marketValue || 0
    const passiveZakatable = hawlMet ? (values.passiveInvestments?.zakatableValue || 0) : 0
    const passiveZakatDue = passiveZakatable * ZAKAT_RATE
    const passiveMethod = values.passiveInvestments?.method || 'detailed'

    // Dividends - Zakat is 2.5% of total earnings
    const dividendValue = safeCalculate(values.total_dividend_earnings)
    const dividendZakatable = hawlMet ? dividendValue : 0
    const dividendZakatDue = dividendZakatable * ZAKAT_RATE

    // Investment Funds
    const fundValue = safeCalculate(values.fund_value)
    const fundZakatable = hawlMet
      ? (values.is_passive_fund ? fundValue * PASSIVE_FUND_RATE : fundValue)
      : 0
    const fundZakatDue = fundZakatable * ZAKAT_RATE

    // Per-account breakdown
    const accountsActive = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) => sum + safeCalculate(acc.active), 0) : 0
    const accountsPassive = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) => sum + safeCalculate(acc.passive), 0) : 0
    const accountsDividends = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) => sum + safeCalculate(acc.dividends), 0) : 0
    const accountsPreciousMetals = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) => sum + safeCalculate(acc.preciousMetals), 0) : 0
    const accountsCash = Array.isArray(values.stockAccounts)
      ? values.stockAccounts.reduce((sum, acc) => sum + safeCalculate(acc.cash), 0) : 0
    const accountsTotal = accountsActive + accountsPassive + accountsDividends + accountsPreciousMetals + accountsCash
    const accountsZakatable = hawlMet
      ? accountsActive + accountsPassive * PASSIVE_FUND_RATE + accountsDividends + accountsPreciousMetals + accountsCash
      : 0
    const accountsZakatDue = accountsZakatable * ZAKAT_RATE

    // Calculate totals
    const total = activeValue + passiveValue + dividendValue + fundValue + accountsTotal
    const zakatable = activeZakatable + passiveZakatable + dividendZakatable + fundZakatable + accountsZakatable
    const zakatDue = zakatable * ZAKAT_RATE

    // Create breakdown with detailed information
    const items: Record<string, AssetBreakdownItem> = {
      active_trading: {
        value: activeValue,
        isZakatable: hawlMet,
        zakatable: activeZakatable,
        zakatDue: activeZakatDue,
        label: 'Actively Traded Stocks',
        tooltip: 'Full market value is zakatable'
      },
      passive_investments: {
        value: passiveValue,
        isZakatable: hawlMet,
        zakatable: passiveZakatable,
        zakatDue: passiveZakatDue,
        label: `Passive Investments (${passiveMethod === 'quick' ? '30% Rule' : 'CRI Method'})`,
        tooltip: passiveMethod === 'quick'
          ? '30% of market value is zakatable'
          : 'Based on company financials'
      },
      dividends: {
        value: dividendValue,
        isZakatable: hawlMet,
        zakatable: dividendZakatable,
        zakatDue: dividendZakatDue,
        label: 'Total Dividend Earnings',
        tooltip: 'Full dividend amount is zakatable'
      },
      investment_funds: {
        value: fundValue,
        isZakatable: hawlMet,
        zakatable: fundZakatable,
        zakatDue: fundZakatDue,
        label: values.is_passive_fund ? 'Passive Investment Funds (30% Rule)' : 'Active Investment Funds',
        tooltip: values.is_passive_fund
          ? '30% of fund value is zakatable'
          : 'Full fund value is zakatable'
      }
    }

    // Add per-account breakdown if any accounts exist
    if (accountsTotal > 0 || (Array.isArray(values.stockAccounts) && values.stockAccounts.length > 0)) {
      items.stock_accounts = {
        value: accountsTotal,
        isZakatable: hawlMet,
        zakatable: accountsZakatable,
        zakatDue: accountsZakatDue,
        label: 'Investment Accounts',
        tooltip: 'Active: 100% zakatable · Passive: 30% zakatable · Dividends: 100% zakatable · Precious Metals: 100% zakatable · Cash: 100% zakatable'
      }
    }

    return {
      total,
      zakatable,
      zakatDue,
      items
    }
  }
}