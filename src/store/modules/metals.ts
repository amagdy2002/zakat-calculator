import { StateCreator } from 'zustand'
import { MetalsValues, MetalPrices, MetalsPreferences, GoldPurity, MetalInputMode } from './metals.types'
import { DEFAULT_HAWL_STATUS } from '../constants'
import { clearMetalsCalculationCache } from '../utils'
import { ZakatState } from '../types'
import { ZAKAT_RATE } from '@/lib/constants'
import { WeightUnit } from '@/lib/utils/units'
import debug from '@/lib/utils/debug'

// Initial values
const initialMetalsValues: MetalsValues = {
  gold_investment: 0,
  gold_investment_purity: '24K',
  gold_investment_input_mode: 'weight',
  gold_investment_value: 0,
  silver_investment: 0,
  silver_investment_input_mode: 'weight',
  silver_investment_value: 0,
}

const initialMetalPrices: MetalPrices = {
  gold: 0,
  silver: 0,
  lastUpdated: new Date(),
  isCache: false,
  currency: 'USD'
}

const initialMetalsPreferences: MetalsPreferences = {
  weightUnit: 'gram'
}

export interface MetalsSlice {
  // State
  metalsValues: MetalsValues
  metalPrices: MetalPrices
  metalsHawlMet: boolean
  metalsPreferences: MetalsPreferences

  // Actions
  setMetalsValue: (key: keyof MetalsValues, value: number | GoldPurity | MetalInputMode) => void
  resetMetalsValues: () => void
  setMetalsValues: (values: Partial<MetalsValues>) => void
  setMetalPrices: (prices: Partial<MetalPrices>) => void
  setMetalsHawl: (value: boolean) => void
  setMetalsWeightUnit: (unit: WeightUnit) => void

  // Getters
  getMetalsTotal: () => number
  getMetalsZakatable: () => number
  getMetalsBreakdown: () => {
    total: number
    zakatable: number
    zakatDue: number
    goldGrams: number
    silverGrams: number
    items: Record<string, {
      value: number;
      weight: number;
      purity?: GoldPurity;
      isZakatable: boolean;
      isExempt: boolean;
      zakatable: number;
      zakatDue: number
    }>
  }
}

/** Derive the monetary value for a metal from the stored values + prices */
function deriveMetalValue(
  weight: number,
  directValue: number,
  inputMode: MetalInputMode,
  pricePerGram: number
): number {
  if (inputMode === 'value') {
    return directValue || 0
  }
  return (weight || 0) * pricePerGram
}

export const createMetalsSlice: StateCreator<
  ZakatState,
  [],
  [],
  MetalsSlice
> = (set, get) => ({
  // Initial state
  metalsValues: initialMetalsValues,
  metalPrices: initialMetalPrices,
  metalsHawlMet: DEFAULT_HAWL_STATUS.metals,
  metalsPreferences: initialMetalsPreferences,

  // Actions
  setMetalsValue: (key: keyof MetalsValues, value: number | GoldPurity | MetalInputMode) =>
    set((state: ZakatState) => ({
      metalsValues: {
        ...state.metalsValues,
        [key]: value
      }
    })),

  resetMetalsValues: () => set({ metalsValues: initialMetalsValues }),

  setMetalsValues: (values: Partial<MetalsValues>) => {
    debug.info('Setting metals values', values, 'metals');
    set((state) => ({
      metalsValues: {
        ...state.metalsValues,
        ...values
      }
    }));
    clearMetalsCalculationCache();
  },

  setMetalPrices: (prices: Partial<MetalPrices>) => {
    const currentPrices = get().metalPrices;
    const updatedPrices = {
      ...currentPrices,
      ...prices,
      lastUpdated: prices.lastUpdated || new Date()
    };

    console.log('Updating metal prices:', {
      from: { gold: currentPrices.gold, silver: currentPrices.silver, currency: currentPrices.currency },
      to:   { gold: updatedPrices.gold, silver: updatedPrices.silver, currency: updatedPrices.currency }
    });

    set({ metalPrices: updatedPrices });
    clearMetalsCalculationCache();

    const state = get();
    if (typeof state.updateNisabWithPrices === 'function') {
      const success = state.updateNisabWithPrices(updatedPrices);
      if (!success && typeof state.forceRefreshNisabForCurrency === 'function' && updatedPrices.currency) {
        state.forceRefreshNisabForCurrency(updatedPrices.currency)
          .catch(error => console.error('Error in fallback nisab refresh:', error));
      }
    } else if (typeof state.forceRefreshNisabForCurrency === 'function' && updatedPrices.currency) {
      state.forceRefreshNisabForCurrency(updatedPrices.currency)
        .catch(error => console.error('Error refreshing nisab data:', error));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('metal-prices-updated', {
        detail: { prices: updatedPrices, timestamp: new Date().toISOString() }
      }));
    }
  },

  setMetalsHawl: (value: boolean) => set({ metalsHawlMet: value }),

  setMetalsWeightUnit: (unit: WeightUnit) =>
    set((state: ZakatState) => ({
      metalsPreferences: {
        ...state.metalsPreferences,
        weightUnit: unit
      }
    })),

  // Getters
  getMetalsTotal: () => {
    const { metalsValues, metalPrices } = get();
    const goldValue = deriveMetalValue(
      metalsValues.gold_investment,
      metalsValues.gold_investment_value,
      metalsValues.gold_investment_input_mode,
      metalPrices.gold
    );
    const silverValue = deriveMetalValue(
      metalsValues.silver_investment,
      metalsValues.silver_investment_value,
      metalsValues.silver_investment_input_mode,
      metalPrices.silver
    );
    debug.trace('Computed metals total', { goldValue, silverValue }, 'calculation');
    return goldValue + silverValue;
  },

  getMetalsZakatable: () => {
    const { metalsValues, metalPrices, metalsHawlMet } = get();
    if (!metalsHawlMet) return 0;
    const goldValue = deriveMetalValue(
      metalsValues.gold_investment,
      metalsValues.gold_investment_value,
      metalsValues.gold_investment_input_mode,
      metalPrices.gold
    );
    const silverValue = deriveMetalValue(
      metalsValues.silver_investment,
      metalsValues.silver_investment_value,
      metalsValues.silver_investment_input_mode,
      metalPrices.silver
    );
    return goldValue + silverValue;
  },

  getMetalsBreakdown: () => {
    const { metalsValues, metalPrices, metalsHawlMet } = get();

    const goldValue = deriveMetalValue(
      metalsValues.gold_investment,
      metalsValues.gold_investment_value,
      metalsValues.gold_investment_input_mode,
      metalPrices.gold
    );
    const silverValue = deriveMetalValue(
      metalsValues.silver_investment,
      metalsValues.silver_investment_value,
      metalsValues.silver_investment_input_mode,
      metalPrices.silver
    );

    const goldZakatable = metalsHawlMet ? goldValue : 0;
    const silverZakatable = metalsHawlMet ? silverValue : 0;

    const items = {
      gold_investment: {
        value: goldValue,
        weight: metalsValues.gold_investment,
        purity: metalsValues.gold_investment_purity,
        isZakatable: true,
        isExempt: false,
        zakatable: goldZakatable,
        zakatDue: goldZakatable * ZAKAT_RATE
      },
      silver_investment: {
        value: silverValue,
        weight: metalsValues.silver_investment,
        isZakatable: true,
        isExempt: false,
        zakatable: silverZakatable,
        zakatDue: silverZakatable * ZAKAT_RATE
      }
    }

    const total = goldValue + silverValue;
    const zakatable = goldZakatable + silverZakatable;
    const zakatDue = zakatable * ZAKAT_RATE;

    return {
      total,
      zakatable,
      zakatDue,
      goldGrams: metalsValues.gold_investment,
      silverGrams: metalsValues.silver_investment,
      items
    }
  }
})