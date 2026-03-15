import { MetalsValues, MetalPrices, GoldPurity, MetalInputMode } from '../modules/metals.types'
import { ZAKAT_RATE } from '@/lib/constants'
import { DEFAULT_METAL_PRICES } from '@/lib/constants/metals'

// Cache for metals calculations to prevent excessive recalculations
interface CacheEntry {
  result: any;
  timestamp: number;
}

const metalsCalculationCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 20;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Gold purity factors
const PURITY = {
  '24K': 1.00,
  '22K': 0.9167,
  '21K': 0.8750,
  '18K': 0.7500
};

const getGoldPriceForPurity = (basePrice: number, purity: GoldPurity): number =>
  basePrice * PURITY[purity];

const getValidPurity = (purity: GoldPurity | undefined): GoldPurity => {
  if (purity && ['24K', '22K', '21K', '18K'].includes(purity)) {
    return purity;
  }
  return '24K';
};

/** Derive monetary value based on input mode */
function deriveValue(
  weight: number,
  directValue: number,
  inputMode: MetalInputMode,
  pricePerGram: number
): number {
  if (inputMode === 'value') return directValue || 0;
  return (weight || 0) * pricePerGram;
}

// Helper to compute metals results (investment-only)
export const computeMetalsResults = (
  values: MetalsValues,
  prices: MetalPrices,
  hawlMet: boolean
) => {
  const cacheKey = JSON.stringify({
    values,
    prices: { gold: prices.gold, silver: prices.silver, currency: prices.currency },
    hawlMet
  });

  const now = Date.now();
  const cachedEntry = metalsCalculationCache.get(cacheKey);
  if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL) {
    return cachedEntry.result;
  }

  const safetyPrices = { ...prices };
  const currentTimestamp = new Date().toISOString();

  if (!safetyPrices.currency) {
    console.error('Metal prices missing currency in computation, defaulting to USD');
    safetyPrices.currency = 'USD';
  }

  let priceValid = true;
  const isCurrencyTransition =
    (!Number.isFinite(safetyPrices?.gold) || safetyPrices?.gold <= 0) &&
    (!Number.isFinite(safetyPrices?.silver) || safetyPrices?.silver <= 0);

  if (isCurrencyTransition) {
    priceValid = false;
    safetyPrices.gold = DEFAULT_METAL_PRICES.gold;
    safetyPrices.silver = DEFAULT_METAL_PRICES.silver;
  } else {
    if (!Number.isFinite(safetyPrices?.gold) || safetyPrices?.gold <= 0) {
      priceValid = false;
      safetyPrices.gold = DEFAULT_METAL_PRICES.gold;
    }
    if (!Number.isFinite(safetyPrices?.silver) || safetyPrices?.silver <= 0) {
      priceValid = false;
      safetyPrices.silver = DEFAULT_METAL_PRICES.silver;
    }
  }

  const goldInvestmentPurity = getValidPurity(values?.gold_investment_purity);
  const goldPricePerGram = getGoldPriceForPurity(safetyPrices.gold, goldInvestmentPurity);

  const goldValue = deriveValue(
    values?.gold_investment || 0,
    values?.gold_investment_value || 0,
    values?.gold_investment_input_mode || 'weight',
    goldPricePerGram
  );
  const silverValue = deriveValue(
    values?.silver_investment || 0,
    values?.silver_investment_value || 0,
    values?.silver_investment_input_mode || 'weight',
    safetyPrices.silver
  );

  const total = goldValue + silverValue;
  const zakatable = hawlMet ? total : 0;
  const zakatDue = zakatable * ZAKAT_RATE;

  const result = {
    total: Number.isFinite(total) ? total : 0,
    zakatable: Number.isFinite(zakatable) ? zakatable : 0,
    zakatDue: Number.isFinite(zakatDue) ? zakatDue : 0,
    breakdown: {
      gold: {
        investment: {
          weight: values?.gold_investment || 0,
          value: goldValue,
          purity: goldInvestmentPurity,
          isZakatable: hawlMet,
          isExempt: false
        },
        total: { weight: values?.gold_investment || 0, value: goldValue },
        zakatable: { weight: hawlMet ? (values?.gold_investment || 0) : 0, value: hawlMet ? goldValue : 0 }
      },
      silver: {
        investment: {
          weight: values?.silver_investment || 0,
          value: silverValue,
          isZakatable: hawlMet,
          isExempt: false
        },
        total: { weight: values?.silver_investment || 0, value: silverValue },
        zakatable: { weight: hawlMet ? (values?.silver_investment || 0) : 0, value: hawlMet ? silverValue : 0 }
      }
    },
    currency: safetyPrices.currency,
    validPrices: priceValid,
    calculatedAt: currentTimestamp
  };

  if (metalsCalculationCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = metalsCalculationCache.keys().next().value;
    if (oldestKey) metalsCalculationCache.delete(oldestKey);
  }

  metalsCalculationCache.set(cacheKey, { result, timestamp: now });
  return result;
};

export const clearMetalsCalculationCache = () => {
  metalsCalculationCache.clear();
  console.log('Metals calculation cache cleared');
};