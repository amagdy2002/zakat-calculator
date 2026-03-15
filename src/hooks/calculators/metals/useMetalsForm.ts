/**
 * Precious Metals Form Hook - Manages form state for investment metals calculator
 * - Handles unit conversions between grams, tolas, ounces (weight mode)
 * - Supports direct monetary value entry (value mode)
 * - Syncs with global state for consistent calculations
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useZakatStore } from '@/store/zakatStore'
import { toGrams, fromGrams, WeightUnit } from '@/lib/utils/units'
import { MetalsValues, MetalInputMode } from '@/store/modules/metals.types'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { useCalculatorReset } from '@/hooks/useCalculatorReset'

export interface MetalCategory {
  id: string
  name: string
  description: string
  isZakatable: boolean
  metal: 'gold' | 'silver'
}

export const METAL_CATEGORIES: MetalCategory[] = [
  {
    id: 'gold_investment',
    name: 'Investment Gold',
    description: 'Gold bars, coins, ETFs, or any gold held for investment',
    isZakatable: true,
    metal: 'gold'
  },
  {
    id: 'silver_investment',
    name: 'Investment Silver',
    description: 'Silver bars, coins, ETFs, or any silver held for investment',
    isZakatable: true,
    metal: 'silver'
  }
]

interface UseMetalsFormProps {
  onUpdateValues?: (values: Record<string, number>) => void
}

export function useMetalsForm({ onUpdateValues }: UseMetalsFormProps = {}) {
  const {
    metalsValues = {
      gold_investment: 0,
      gold_investment_purity: '24K',
      gold_investment_input_mode: 'weight',
      gold_investment_value: 0,
      silver_investment: 0,
      silver_investment_input_mode: 'weight',
      silver_investment_value: 0,
    },
    setMetalsValue,
    metalsPreferences = { weightUnit: 'gram' as WeightUnit },
    setMetalsWeightUnit
  } = useZakatStore()

  const [selectedUnit, setSelectedUnit] = useState<WeightUnit>(
    metalsPreferences.weightUnit || 'gram'
  )

  // Input values for weight fields (shown in selected unit)
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>(() => ({
    gold_investment:   metalsValues.gold_investment   > 0 ? fromGrams(metalsValues.gold_investment,   selectedUnit).toString() : '',
    silver_investment: metalsValues.silver_investment > 0 ? fromGrams(metalsValues.silver_investment, selectedUnit).toString() : '',
  }))

  // Input values for value fields (direct monetary)
  const [valueInputs, setValueInputs] = useState<Record<string, string>>(() => ({
    gold_investment:   metalsValues.gold_investment_value   > 0 ? metalsValues.gold_investment_value.toString()   : '',
    silver_investment: metalsValues.silver_investment_value > 0 ? metalsValues.silver_investment_value.toString() : '',
  }))

  const [lastUnitChange, setLastUnitChange] = useState<number | null>(null)
  const [activeInputId, setActiveInputId] = useState<string | null>(null)
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isComponentMounted, setIsComponentMounted] = useState(false)
  const isHydrated = useStoreHydration()

  // Sync weight inputs from store when unit changes or store updates
  useEffect(() => {
    if (activeInputId) return
    const newWeights: Record<string, string> = {}
    let changed = false
    METAL_CATEGORIES.forEach(cat => {
      const grams = metalsValues[cat.id as keyof MetalsValues] as number || 0
      if (grams > 0) {
        const converted = fromGrams(grams, selectedUnit)
        let display = ''
        if (selectedUnit === 'ounce') display = converted.toFixed(6).replace(/\.?0+$/, '')
        else if (selectedUnit === 'tola') display = converted.toFixed(4).replace(/\.?0+$/, '')
        else display = converted.toFixed(3).replace(/\.?0+$/, '')
        if (weightInputs[cat.id] !== display) { newWeights[cat.id] = display; changed = true }
        else newWeights[cat.id] = weightInputs[cat.id]
      } else if (weightInputs[cat.id] !== '') {
        newWeights[cat.id] = ''; changed = true
      } else {
        newWeights[cat.id] = ''
      }
    })
    if (changed) setWeightInputs(newWeights)
  }, [metalsValues, selectedUnit, activeInputId])

  // Detect store reset
  useEffect(() => {
    const isReset = METAL_CATEGORIES.every(cat => {
      const v = metalsValues[cat.id as keyof MetalsValues]
      return v === 0 || v === undefined
    })
    if (isReset) {
      setWeightInputs({ gold_investment: '', silver_investment: '' })
      setValueInputs({ gold_investment: '', silver_investment: '' })
      setActiveInputId(null)
      if (inputTimeoutRef.current) { clearTimeout(inputTimeoutRef.current); inputTimeoutRef.current = null }
    }
  }, [metalsValues])

  useEffect(() => { setIsComponentMounted(true); return () => setIsComponentMounted(false) }, [])

  // Post-hydration init
  useEffect(() => {
    if (!isHydrated) return
    const newWeights: Record<string, string> = {}
    const newValues: Record<string, string> = {}
    METAL_CATEGORIES.forEach(cat => {
      const grams = metalsValues[cat.id as keyof MetalsValues] as number || 0
      newWeights[cat.id] = grams > 0 ? fromGrams(grams, selectedUnit).toString() : ''
      const directValue = metalsValues[`${cat.id}_value` as keyof MetalsValues] as number || 0
      newValues[cat.id] = directValue > 0 ? directValue.toString() : ''
    })
    setWeightInputs(newWeights)
    setValueInputs(newValues)
  }, [isHydrated])

  // Unit change handler
  const handleUnitChange = (value: WeightUnit) => {
    if (value === selectedUnit) return
    setActiveInputId(null)
    if (inputTimeoutRef.current) { clearTimeout(inputTimeoutRef.current); inputTimeoutRef.current = null }

    const hasValues = METAL_CATEGORIES.some(cat => {
      const v = metalsValues[cat.id as keyof MetalsValues]
      return Number(v) > 0
    })
    if (hasValues) {
      setLastUnitChange(Date.now())
      setTimeout(() => setLastUnitChange(null), 1500)
    }

    setSelectedUnit(value)
    setMetalsWeightUnit(value)

    const converted: Record<string, string> = {}
    METAL_CATEGORIES.forEach(cat => {
      const grams = metalsValues[cat.id as keyof MetalsValues] as number || 0
      if (grams > 0) {
        const cv = fromGrams(grams, value)
        let fmt = ''
        if (value === 'ounce') fmt = cv.toFixed(6).replace(/\.?0+$/, '')
        else if (value === 'tola') fmt = cv.toFixed(4).replace(/\.?0+$/, '')
        else fmt = cv.toFixed(3).replace(/\.?0+$/, '')
        converted[cat.id] = fmt
      } else {
        converted[cat.id] = ''
      }
    })
    setWeightInputs(converted)
  }

  // Weight input handler
  const handleWeightChange = (categoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    setActiveInputId(categoryId)
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current)
    inputTimeoutRef.current = setTimeout(() => setActiveInputId(null), 1000)

    setWeightInputs(prev => ({ ...prev, [categoryId]: inputValue }))

    if (inputValue === '') {
      setMetalsValue(categoryId as keyof MetalsValues, 0)
      return
    }

    if (selectedUnit === 'ounce') {
      if (!/^[0-9]*\.?[0-9]*$/.test(inputValue)) return
      if (inputValue === '.' || inputValue.endsWith('.')) return
      const num = parseFloat(inputValue)
      if (isNaN(num)) return
      const grams = Number(toGrams(num, 'ounce').toFixed(6))
      setMetalsValue(categoryId as keyof MetalsValues, grams)
      if (onUpdateValues) {
        const numericVals: Record<string, number> = {}
        Object.entries(metalsValues).forEach(([k, v]) => { if (typeof v === 'number') numericVals[k] = v })
        numericVals[categoryId] = grams
        onUpdateValues(numericVals)
      }
      return
    }

    if (!/^[0-9]*\.?[0-9]*$/.test(inputValue)) return
    if (inputValue === '.' || inputValue.endsWith('.')) return
    const num = parseFloat(inputValue)
    if (isNaN(num)) return
    const grams = Number(toGrams(num, selectedUnit).toFixed(3))
    setMetalsValue(categoryId as keyof MetalsValues, grams)
    if (onUpdateValues) {
      const numericVals: Record<string, number> = {}
      Object.entries(metalsValues).forEach(([k, v]) => { if (typeof v === 'number') numericVals[k] = v })
      numericVals[categoryId] = grams
      onUpdateValues(numericVals)
    }
  }

  // Value input handler (direct monetary)
  const handleValueChange = (categoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value
    setActiveInputId(categoryId + '_value')
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current)
    inputTimeoutRef.current = setTimeout(() => setActiveInputId(null), 1000)

    setValueInputs(prev => ({ ...prev, [categoryId]: inputValue }))

    if (inputValue === '') {
      setMetalsValue(`${categoryId}_value` as keyof MetalsValues, 0)
      return
    }
    if (!/^[0-9]*\.?[0-9]*$/.test(inputValue)) return
    if (inputValue === '.' || inputValue.endsWith('.')) return
    const num = parseFloat(inputValue)
    if (isNaN(num)) return
    setMetalsValue(`${categoryId}_value` as keyof MetalsValues, num)
  }

  // Input mode toggle handler
  const handleInputModeChange = (categoryId: string, mode: MetalInputMode) => {
    setMetalsValue(`${categoryId}_input_mode` as keyof MetalsValues, mode)
    // Clear only the counter-field to avoid stale data conflicts
    if (mode === 'weight') {
      setMetalsValue(`${categoryId}_value` as keyof MetalsValues, 0)
      setValueInputs(prev => ({ ...prev, [categoryId]: '' }))
    } else {
      setMetalsValue(categoryId as keyof MetalsValues, 0)
      setWeightInputs(prev => ({ ...prev, [categoryId]: '' }))
    }
  }

  const handleKeyDown = (categoryId: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']
    if (allowedKeys.includes(event.key) || /^[0-9]$/.test(event.key)) return
    if (event.key === '.') {
      if (selectedUnit === 'ounce') return
      if (event.currentTarget.value.includes('.')) event.preventDefault()
      return
    }
    event.preventDefault()
  }

  // Cleanup timeout on unmount
  useEffect(() => () => { if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current) }, [])

  const handleStoreReset = useCallback(() => {
    setActiveInputId(null)
    if (inputTimeoutRef.current) { clearTimeout(inputTimeoutRef.current); inputTimeoutRef.current = null }
    setWeightInputs({ gold_investment: '', silver_investment: '' })
    setValueInputs({ gold_investment: '', silver_investment: '' })
  }, [])

  useCalculatorReset(isHydrated, handleStoreReset)

  return {
    weightInputs,
    valueInputs,
    selectedUnit,
    lastUnitChange,
    activeInputId,
    isComponentMounted,
    isHydrated,
    handleUnitChange,
    handleWeightChange,
    handleValueChange,
    handleInputModeChange,
    handleKeyDown,
  }
}