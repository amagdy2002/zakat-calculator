import { AssetBreakdown } from '@/lib/assets/types'

export interface CryptoHolding {
  symbol: string
  quantity: number
  currentPrice: number
  marketValue: number
  zakatDue: number
  currency?: string
  isFallback?: boolean
  /** How the user entered this holding */
  inputMode?: 'quantity' | 'value'
  /** The raw value the user typed (coins or currency amount) */
  inputValue?: number
}

export interface CryptoValues extends Record<string, unknown> {
  coins: CryptoHolding[]
  total_value: number
  zakatable_value: number
}

export interface CryptoSlice {
  // State
  cryptoValues: CryptoValues
  cryptoHawlMet: boolean
  isLoading: boolean
  lastError: string | null

  // Actions
  addCoin: (symbol: string, amount: number, currency?: string, inputMode?: 'quantity' | 'value') => Promise<void>
  removeCoin: (symbol: string) => void
  resetCryptoValues: () => void
  setCryptoHawl: (value: boolean) => void
  updatePrices: (currency?: string) => Promise<void>
  updateCryptoPrices: (targetCurrency: string, fromCurrency?: string) => void

  // Getters
  getTotalCrypto: () => number
  getTotalZakatableCrypto: () => number
  getCryptoBreakdown: () => AssetBreakdown
} 