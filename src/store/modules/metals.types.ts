import { WeightUnit } from '@/lib/utils/units'

export type GoldPurity = '24K' | '22K' | '21K' | '18K'
export type MetalInputMode = 'weight' | 'value'

export interface MetalsValues {
  gold_investment: number
  gold_investment_purity: GoldPurity
  gold_investment_input_mode: MetalInputMode
  gold_investment_value: number   // direct monetary value if input_mode === 'value'
  silver_investment: number
  silver_investment_input_mode: MetalInputMode
  silver_investment_value: number // direct monetary value if input_mode === 'value'
}

export interface MetalPrices {
  gold: number
  silver: number
  lastUpdated: Date
  isCache: boolean
  source?: string
  currency: string
}

export interface MetalsPreferences {
  weightUnit: WeightUnit
}