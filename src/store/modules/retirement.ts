import { StateCreator } from 'zustand'
import { RetirementValues, ZakatState } from '../types'
import { RetirementAccount, RetirementAccountType, RETIREMENT_ACCOUNT_META } from './retirement.types'
import { getAssetType } from '@/lib/assets/registry'
import { roundCurrency } from '@/lib/utils/currency'
import { AssetBreakdown } from '@/lib/assets/types'
import { AssetValidation } from '@/lib/validation/assetValidation'
import { DEFAULT_HAWL_STATUS } from '../constants'

export interface RetirementSlice {
  retirement: RetirementValues
  retirementHawlMet: boolean
  setRetirementValue: (key: keyof RetirementValues, value: number) => void
  setRetirementHawlMet: (hawlMet: boolean) => void
  resetRetirement: () => void
  updateRetirementValues: (values: Partial<RetirementValues>) => void
  getRetirementTotal: () => number
  getRetirementZakatable: () => number
  getRetirementBreakdown: () => AssetBreakdown
  // Per-account actions
  addRetirementAccount: (accountType?: RetirementAccountType) => void
  removeRetirementAccount: (id: string) => void
  updateRetirementAccount: (id: string, updates: Partial<Omit<RetirementAccount, 'id'>>) => void
}

const initialRetirementValues: RetirementValues = {
  traditional_401k: 0,
  traditional_ira: 0,
  roth_401k: 0,
  roth_ira: 0,
  pension: 0,
  other_retirement: 0,
  retirementAccounts: [],
}

export const createRetirementSlice: StateCreator<
  ZakatState,
  [["zustand/persist", unknown]],
  [],
  RetirementSlice
> = (set, get) => ({
  retirement: initialRetirementValues,
  retirementHawlMet: DEFAULT_HAWL_STATUS.retirement,

  setRetirementValue: (key: keyof RetirementValues, value: number) => {
    // First validate the new value in context of current values
    const currentValues = get().retirement
    const newValues = {
      ...currentValues,
      [key]: value
    }

    const validationResult = AssetValidation.validateInput('retirement', newValues)
    if (!validationResult.isValid) {
      console.error('Retirement validation failed:', validationResult.errors)
      // Optionally throw or handle errors
      return
    }

    // If validation passes, update the store
    set((state: ZakatState) => ({
      retirement: {
        ...state.retirement,
        [key]: roundCurrency(value)
      }
    }))

    // After updating, validate calculations
    const state = get()
    const retirementAsset = getAssetType('retirement')
    if (retirementAsset) {
      const total = retirementAsset.calculateTotal(newValues)
      const zakatable = retirementAsset.calculateZakatable(
        newValues,
        undefined,
        state.retirementHawlMet
      )
      const breakdown = retirementAsset.getBreakdown(
        newValues,
        undefined,
        state.retirementHawlMet
      )

      // Validate calculations
      const calcValidation = AssetValidation.validateCalculations({
        assetType: 'retirement',
        values: newValues,
        breakdown,
        calculatedTotal: total,
        calculatedZakatable: zakatable
      })

      if (!calcValidation.isValid) {
        console.error('Retirement calculation validation failed:', calcValidation.errors)
        // Handle calculation errors
      }
    }
  },

  updateRetirementValues: (values: Partial<RetirementValues>) => {
    // Validate the updated values
    const currentValues = get().retirement
    const newValues = {
      ...currentValues,
      ...values
    }

    const validationResult = AssetValidation.validateInput('retirement', newValues)
    if (!validationResult.isValid) {
      console.error('Retirement validation failed:', validationResult.errors)
      return
    }

    // Update values in store
    set((state: ZakatState) => ({
      retirement: {
        ...state.retirement,
        ...Object.entries(values).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === 'number' ? roundCurrency(value) : value
        }), {})
      }
    }))
  },

  setRetirementHawlMet: (hawlMet: boolean) =>
    set(() => ({
      retirementHawlMet: hawlMet
    })),

  resetRetirement: () =>
    set(() => ({
      retirement: { ...initialRetirementValues, retirementAccounts: [] },
      retirementHawlMet: DEFAULT_HAWL_STATUS.retirement
    })),

  getRetirementTotal: () => {
    const state = get()
    const retirementAsset = getAssetType('retirement')
    if (!retirementAsset) return 0
    const total = retirementAsset.calculateTotal(state.retirement)
    return roundCurrency(total)
  },

  getRetirementZakatable: () => {
    const state = get()
    const retirementAsset = getAssetType('retirement')
    if (!retirementAsset) return 0
    const zakatable = retirementAsset.calculateZakatable(
      state.retirement,
      undefined,
      state.retirementHawlMet
    )
    return roundCurrency(zakatable)
  },

  getRetirementBreakdown: () => {
    const state = get()
    const retirementAsset = getAssetType('retirement')
    if (!retirementAsset) {
      return {
        total: 0,
        zakatable: 0,
        zakatDue: 0,
        items: {}
      }
    }
    return retirementAsset.getBreakdown(
      state.retirement,
      undefined,
      state.retirementHawlMet
    )
  },

  // Per-account CRUD
  addRetirementAccount: (accountType: RetirementAccountType = 'traditional_401k') => {
    const meta = RETIREMENT_ACCOUNT_META[accountType]
    const newAccount: RetirementAccount = {
      id: Date.now().toString(),
      name: '',
      accountType,
      balance: 0,
      preciousMetals: 0,
      cash: 0,
      taxRate: meta.defaultTaxRate,
      penaltyRate: meta.defaultPenaltyRate,
      isAccessible: !meta.isLocked,
      treatment: 'cash',
      active: 0,
      passive: 0,
      dividends: 0,
      isTaxDifferentiated: false,
      principal: 0,
      gains: 0,
    }
    set((state) => ({
      retirement: {
        ...state.retirement,
        retirementAccounts: [
          ...(state.retirement.retirementAccounts || []),
          newAccount,
        ],
      },
    }))
  },

  removeRetirementAccount: (id: string) => {
    set((state) => ({
      retirement: {
        ...state.retirement,
        retirementAccounts: (state.retirement.retirementAccounts || []).filter(
          (a) => a.id !== id
        ),
      },
    }))
  },

  updateRetirementAccount: (id: string, updates: Partial<Omit<RetirementAccount, 'id'>>) => {
    set((state) => ({
      retirement: {
        ...state.retirement,
        retirementAccounts: (state.retirement.retirementAccounts || []).map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
    }))
  },
}) 