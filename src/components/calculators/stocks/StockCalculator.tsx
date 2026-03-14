'use client'

import { useCallback, useEffect } from 'react'
import { useZakatStore } from '@/store/zakatStore'
import { formatCurrency as formatCurrencyBase } from '@/lib/utils'
import { AccountsTab } from './tabs/AccountsTab'
import { getAssetType } from '@/lib/assets/registry'
import { CalculatorNav } from '@/components/ui/calculator-nav'
import { CalculatorProps } from '@/types/calculator'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { useCalculatorReset } from '@/hooks/useCalculatorReset'

const PASSIVE_FUND_RATE = 0.3

export function StockCalculator({
  currency,
  onUpdateValues,
  onHawlUpdate,
  onCalculatorChange,
  onOpenSummary,
}: CalculatorProps) {
  const {
    stockValues,
    stockHawlMet,
    stockPrices,
    setStockHawl,
    resetStockValues,
    addStockAccount,
    removeStockAccount,
    updateStockAccount,
  } = useZakatStore()

  const stockAsset = getAssetType('stocks')
  const isHydrated = useStoreHydration()

  // Sync hawl on hydration
  useEffect(() => {
    if (!isHydrated) return
    setStockHawl(stockHawlMet)
    onHawlUpdate(stockHawlMet)
  }, [isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Push updated totals up to the parent whenever store values change
  useEffect(() => {
    if (!isHydrated || !stockAsset) return
    const total = stockAsset.calculateTotal(stockValues, stockPrices)
    const zakatable = stockAsset.calculateZakatable(stockValues, stockPrices, stockHawlMet)
    onUpdateValues({ total_stock_value: total, zakatable_stock_value: zakatable })
  }, [stockValues, stockHawlMet, isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset handler
  const handleStoreReset = useCallback(() => {
    resetStockValues()
    onUpdateValues({ total_stock_value: 0, zakatable_stock_value: 0 })
  }, [onUpdateValues, resetStockValues])

  useCalculatorReset(isHydrated, handleStoreReset)

  // Helper that recalculates after any account mutation
  const recalculate = () => {
    if (!stockAsset) return
    const fresh = useZakatStore.getState()
    const total = stockAsset.calculateTotal(fresh.stockValues, fresh.stockPrices)
    const zakatable = stockAsset.calculateZakatable(fresh.stockValues, fresh.stockPrices, fresh.stockHawlMet)
    onUpdateValues({ total_stock_value: total, zakatable_stock_value: zakatable })
  }

  return (
    <div className="space-y-6">
      <AccountsTab
        currency={currency}
        accounts={stockValues.stockAccounts || []}
        onAddAccount={() => {
          addStockAccount()
          recalculate()
        }}
        onRemoveAccount={(id) => {
          removeStockAccount(id)
          recalculate()
        }}
        onUpdateAccount={(id, field, value) => {
          updateStockAccount(id, field, value)
          recalculate()
        }}
        hawlMet={stockHawlMet}
      />

      <CalculatorNav
        currentCalculator="stocks"
        onCalculatorChange={onCalculatorChange}
        onOpenSummary={onOpenSummary}
      />
    </div>
  )
}