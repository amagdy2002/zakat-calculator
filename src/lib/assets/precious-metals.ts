/**
 * Precious Metals Calculator - Calculates Zakat on investment gold and silver
 * - Gold: 85g (20 mithqals) nisab threshold
 * - Silver: 612.36g (52.5 tolas) nisab threshold
 * - Uses current market prices for value calculation
 * - All investment metals are zakatable
 * - Applies standard 2.5% Zakat rate
 */
import { AssetType, AssetBreakdown, ZAKAT_RATE, safeCalculate } from './types'
import { MetalPrices, MetalsValues } from '@/store/modules/metals.types'

function deriveMetalValue(
  weight: number,
  directValue: number,
  inputMode: 'weight' | 'value',
  pricePerGram: number
): number {
  if (inputMode === 'value') return directValue || 0
  return safeCalculate(weight) * pricePerGram
}

export const preciousMetals: AssetType = {
  id: 'precious-metals',
  name: 'Precious Metals',
  color: '#F59E0B', // Amber

  calculateTotal: (values: MetalsValues, prices: MetalPrices) => {
    const goldValue = deriveMetalValue(
      values.gold_investment,
      values.gold_investment_value,
      values.gold_investment_input_mode,
      prices.gold
    )
    const silverValue = deriveMetalValue(
      values.silver_investment,
      values.silver_investment_value,
      values.silver_investment_input_mode,
      prices.silver
    )
    return goldValue + silverValue
  },

  calculateZakatable: (values: MetalsValues, prices: MetalPrices, hawlMet: boolean) => {
    if (!hawlMet) return 0

    const goldValue = deriveMetalValue(
      values.gold_investment,
      values.gold_investment_value,
      values.gold_investment_input_mode,
      prices.gold
    )
    const silverValue = deriveMetalValue(
      values.silver_investment,
      values.silver_investment_value,
      values.silver_investment_input_mode,
      prices.silver
    )
    return goldValue + silverValue
  },

  getBreakdown: (values: MetalsValues, prices: MetalPrices, hawlMet: boolean): AssetBreakdown => {
    const goldValue = deriveMetalValue(
      values.gold_investment,
      values.gold_investment_value,
      values.gold_investment_input_mode,
      prices.gold
    )
    const silverValue = deriveMetalValue(
      values.silver_investment,
      values.silver_investment_value,
      values.silver_investment_input_mode,
      prices.silver
    )

    const goldInvestment = {
      weight: safeCalculate(values.gold_investment),
      value: goldValue,
      isZakatable: hawlMet,
      zakatable: hawlMet ? goldValue : 0,
      zakatDue: hawlMet ? goldValue * ZAKAT_RATE : 0,
      label: 'Investment Gold',
      tooltip: 'Investment gold holdings (bars, coins, ETFs)'
    }

    const silverInvestment = {
      weight: safeCalculate(values.silver_investment),
      value: silverValue,
      isZakatable: hawlMet,
      zakatable: hawlMet ? silverValue : 0,
      zakatDue: hawlMet ? silverValue * ZAKAT_RATE : 0,
      label: 'Investment Silver',
      tooltip: 'Investment silver holdings (bars, coins, ETFs)'
    }

    const items = {
      gold_investment: goldInvestment,
      silver_investment: silverInvestment
    }

    const total = goldValue + silverValue
    const zakatable = (hawlMet ? goldValue : 0) + (hawlMet ? silverValue : 0)
    const zakatDue = zakatable * ZAKAT_RATE

    return { total, zakatable, zakatDue, items }
  }
}