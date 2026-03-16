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

        <div>
          <FAQ
            title="Precious Metals FAQ"
            description=""
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