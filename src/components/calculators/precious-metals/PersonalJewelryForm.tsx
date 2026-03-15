'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/form/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatCurrency as formatCurrencyBase } from '@/lib/utils'
import { CalculatorNav } from '@/components/ui/calculator-nav'
import { FAQ } from '@/components/ui/faq'
import { ASSET_FAQS } from '@/config/faqs'
import { WEIGHT_UNITS, WeightUnit, toGrams, fromGrams } from '@/lib/utils/units'
import { motion, AnimatePresence } from 'framer-motion'
import { useZakatStore } from '@/store/zakatStore'
import { useMetalsForm, useMetalsPrices, METAL_CATEGORIES, MetalCategory } from '@/hooks/calculators/metals'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { useCalculatorReset } from '@/hooks/useCalculatorReset'
import { CalculatorProps } from '@/types/calculator'
import { MetalInputMode } from '@/store/modules/metals.types'

// Gold purity options
const GOLD_PURITY_OPTIONS = [
  { value: '24K', label: '24K (99.9% pure)' },
  { value: '22K', label: '22K (91.7% pure)' },
  { value: '21K', label: '21K (87.5% pure)' },
  { value: '18K', label: '18K (75.0% pure)' },
]



export function PersonalJewelryForm({
  currency,
  onUpdateValues,
  onHawlUpdate,
  onCalculatorChange,
  onOpenSummary,
  initialValues = {},
  initialHawlMet = true
}: CalculatorProps) {
  const isStoreHydrated = useStoreHydration()

  const [selectedGoldPurity, setSelectedGoldPurity] = useState<'24K' | '22K' | '21K' | '18K'>('24K')

  const handleStoreReset = useCallback(() => {
    setSelectedGoldPurity('24K')
    onUpdateValues({})
  }, [onUpdateValues])

  useCalculatorReset(isStoreHydrated, handleStoreReset)

  const {
    weightInputs,
    valueInputs,
    selectedUnit,
    lastUnitChange,
    activeInputId,
    handleUnitChange,
    handleWeightChange,
    handleValueChange,
    handleInputModeChange,
    handleKeyDown,
  } = useMetalsForm({ onUpdateValues })

  const {
    metalPrices,
    isPricesLoading,
    extendedPrices,
    getGoldPriceForPurity,
  } = useMetalsPrices({ currency })

  const {
    metalsValues,
    setMetalsValue,
    setMetalsHawl,
  } = useZakatStore()

  const [isComponentMounted, setIsComponentMounted] = useState(false)
  useEffect(() => {
    setIsComponentMounted(true)
    return () => setIsComponentMounted(false)
  }, [])

  // Investment metals are always hawl = true
  useEffect(() => {
    setMetalsHawl(true)
    onHawlUpdate(true)
  }, [setMetalsHawl, onHawlUpdate])

  // Sync purity from store
  useEffect(() => {
    if (isStoreHydrated) {
      setSelectedGoldPurity(metalsValues.gold_investment_purity || '24K')
    }
  }, [isStoreHydrated, metalsValues.gold_investment_purity])

  const formatCurrency = (value: number) => formatCurrencyBase(value, currency)

  // Unit selector animated indicator
  const unitRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
  useEffect(() => {
    const el = unitRefs.current[selectedUnit]
    if (el) setIndicatorStyle({ width: el.offsetWidth, left: el.offsetLeft })
  }, [selectedUnit, isComponentMounted])

  const handleGoldPurityChange = (purity: '24K' | '22K' | '21K' | '18K') => {
    setSelectedGoldPurity(purity)
    setMetalsValue('gold_investment_purity', purity)
  }

  const getCurrentGoldPrice = () => {
    if (!extendedPrices) return metalPrices.gold
    const p = getGoldPriceForPurity(selectedGoldPurity)
    return p !== null ? p : metalPrices.gold
  }

  /** Compute estimated value for an investment category */
  const getDisplayValue = (category: MetalCategory): number => {
    const inputMode = (metalsValues[`${category.id}_input_mode` as keyof typeof metalsValues] || 'weight') as MetalInputMode
    if (inputMode === 'value') {
      return parseFloat(valueInputs[category.id] || '0') || 0
    }
    const num = parseFloat(weightInputs[category.id] || '0')
    if (isNaN(num) || num === 0) return 0
    const grams = toGrams(num, selectedUnit)
    if (category.metal === 'gold') {
      const p = getGoldPriceForPurity(selectedGoldPurity)
      return grams * (p !== null ? p : metalPrices.gold)
    }
    return grams * metalPrices.silver
  }


  const getInputMode = (categoryId: string): MetalInputMode =>
    (metalsValues[`${categoryId}_input_mode` as keyof typeof metalsValues] as MetalInputMode) || 'weight'

  return (
    <div className="space-y-6">
      <div className="space-y-8">

        {/* ── Personal Jewelry Section ─────────────────────── */}
        <div>
          <FAQ
            title="Personal Jewelry"
            description={`Enter the weight of your personal jewelry in ${WEIGHT_UNITS[selectedUnit].label.toLowerCase()}. Include all gold and silver items worn for personal use.`}
            items={ASSET_FAQS.metals}
            defaultOpen={false}
          />

          {/* Exemption notice */}
          <div className="mt-4 flex gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Personal jewelry is not included in your Zakat calculation.</strong> According to the majority of scholars, gold and silver worn regularly for personal use is exempt. Occasionally-worn jewelry is subject to scholarly disagreement — this calculator follows the exemption view. Your totals below reflect investment metals only.
            </p>
          </div>

          {/* Weight Unit Toggle */}
          <div className="mt-6 mb-6">
            <div className="relative">
              <div className="flex rounded-xl bg-gray-50 px-1 py-1.5 relative">
                <motion.div
                  className="absolute z-0 top-0 bottom-0 bg-white border border-gray-900 rounded-lg"
                  initial={false}
                  animate={{ width: indicatorStyle.width, left: indicatorStyle.left }}
                  transition={{ type: 'tween', duration: 0.1 }}
                />
                {Object.values(WEIGHT_UNITS).map((unit) => (
                  <button
                    key={unit.value}
                    type="button"
                    onClick={() => handleUnitChange(unit.value)}
                    className={cn(
                      'flex-1 flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-lg relative z-10',
                      selectedUnit === unit.value ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                    )}
                    ref={(el) => { if (el) unitRefs.current[unit.value] = el; return undefined }}
                  >
                    <span className="text-sm">
                      {unit.label}{' '}
                      <span className="text-sm text-gray-500">({unit.symbol})</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gold Purity (shared across jewelry + investment) */}
          <div className="mb-6">
            <Label className="font-medium mb-2 block">Gold Purity</Label>
            <div className="grid grid-cols-4 gap-2">
              {GOLD_PURITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleGoldPurityChange(option.value as '24K' | '22K' | '21K' | '18K')}
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-lg border',
                    selectedGoldPurity === option.value
                      ? 'border-gray-700 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className="text-sm font-medium">{option.value}</span>
                  <span className="text-xs text-gray-500">
                    {option.label.match(/\((.+)\)/)?.[1]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Personal jewelry inputs have been removed per user request */}
        </div>

        {/* ── Investment Metals Section ─────────────────────── */}
        <div>
          <div className="space-y-1 mb-6">
            <h3 className="text-base font-semibold text-gray-900">Investment Metals</h3>
            <p className="text-sm text-gray-600">
              Gold or silver held for investment — bars, coins, ETFs, digital gold, etc. All investment metals are fully zakatable.
            </p>
          </div>

          <div className="space-y-8">
            {METAL_CATEGORIES.map((category) => {
              const inputMode = getInputMode(category.id)
              const displayValue = getDisplayValue(category)

              return (
                <div key={category.id} className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold text-sm">{category.name}</Label>
                      <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                    </div>
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Zakatable
                    </span>
                  </div>

                  {/* Weight / Value toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() => handleInputModeChange(category.id, 'weight')}
                      className={cn(
                        'px-4 py-1.5 text-sm font-medium transition-colors',
                        inputMode === 'weight'
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      By Weight
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputModeChange(category.id, 'value')}
                      className={cn(
                        'px-4 py-1.5 text-sm font-medium transition-colors border-l border-gray-200',
                        inputMode === 'value'
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      By Value
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {inputMode === 'weight' ? (
                      <motion.div
                        key="weight"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="relative"
                      >
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={selectedUnit}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.12 }}
                              className="flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 px-1.5 text-sm font-medium text-gray-800"
                            >
                              {WEIGHT_UNITS[selectedUnit].symbol}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                        <Input
                          id={`${category.id}_weight`}
                          type="text"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          className={cn(
                            'pl-12 pr-36 text-sm bg-white border-gray-200 transition-colors duration-300',
                            lastUnitChange && weightInputs[category.id] ? 'bg-yellow-50' : ''
                          )}
                          value={weightInputs[category.id] || ''}
                          onChange={(e) => handleWeightChange(category.id, e)}
                          onKeyDown={(e) => handleKeyDown(category.id, e)}
                          placeholder={`Enter weight in ${WEIGHT_UNITS[selectedUnit].label.toLowerCase()}`}
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          {isPricesLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                              <span className="text-sm text-gray-500">Fetching…</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                              ≈ {formatCurrency(displayValue)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="value"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="relative"
                      >
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 px-1.5 text-sm font-medium text-gray-800">
                            {currency}
                          </span>
                        </div>
                        <Input
                          id={`${category.id}_value`}
                          type="text"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          className="pl-16 pr-4 text-sm bg-white border-gray-200"
                          value={valueInputs[category.id] || ''}
                          onChange={(e) => handleValueChange(category.id, e)}
                          placeholder={`Enter total value in ${currency}`}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {category.metal === 'gold' && inputMode === 'weight' && (
                    <p className="text-xs text-gray-500 ml-1">
                      Using {selectedGoldPurity} gold purity for calculation
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Price freshness indicator */}
        <div className="mt-2 text-xs">
          <div className="flex items-center">
            {!metalPrices.isCache && (
              <span className="relative flex h-[8px] w-[8px] mr-2">
                <span className="relative inline-flex rounded-full h-full w-full bg-green-500 opacity-80 animate-pulse" />
              </span>
            )}
            <span className="text-xs text-gray-400">
              Prices last updated: {new Date(metalPrices.lastUpdated).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <CalculatorNav
        currentCalculator="precious-metals"
        onCalculatorChange={onCalculatorChange}
        onOpenSummary={onOpenSummary}
      />
    </div>
  )
}