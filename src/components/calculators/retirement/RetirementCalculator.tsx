'use client'

import { useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useZakatStore } from '@/store/zakatStore'
import { Button } from '@/components/ui/button'
import { FAQ } from '@/components/ui/faq'
import type { SourceKey } from '@/config/sources'
import { CalculatorNav } from '@/components/ui/calculator-nav'
import { CalculatorProps } from '@/types/calculator'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { useCalculatorReset } from '@/hooks/useCalculatorReset'
import { RetirementAccountCard } from './RetirementAccountCard'
import { RetirementAccount, RetirementAccountType, RETIREMENT_ACCOUNT_META } from '@/store/modules/retirement.types'
import { formatCurrency as formatCurrencyBase } from '@/lib/utils'
import { retirement as retirementAsset } from '@/lib/assets/retirement'

// ─── FAQ items covering all account types ────────────────────────────────────

const RETIREMENT_FAQ = {
  items: [
    {
      question: 'How is Zakat calculated on Traditional 401(k) / 403(b) / IRA accounts?',
      answer:
        'These are pre-tax accounts — contributions were never taxed. When calculating Zakat, scholars say you should base it on the net amount you could actually receive today: subtract your estimated income-tax rate and the 10% early-withdrawal penalty (if under 59½). Example: a $50,000 balance with 22% tax + 10% penalty → net = $34,000 → Zakat = $850.',
      sources: ['IRS_RETIREMENT', 'IRS_PUB_590B', 'FIQH_COUNCIL'] as SourceKey[],
    },
    {
      question: 'How is Zakat calculated on Roth 401(k) / Roth IRA accounts?',
      answer:
        'Roth contributions were made with after-tax money, so the full contribution balance is zakatable without any tax or penalty deduction. Qualified withdrawals (age ≥ 59½, account ≥ 5 years) are fully tax-free. If funds are still inaccessible, some scholars recommend deferring Zakat on the earnings portion; others pay on the full balance.',
      sources: ['IRS_PUB_590B', 'VANGUARD_RETIREMENT', 'SCHWAB_RETIREMENT', 'FIQH_COUNCIL'] as SourceKey[],
    },
    {
      question: 'What about 457(b) plans?',
      answer:
        'Government 457(b) plans have no 10% early-withdrawal penalty — only ordinary income tax applies on withdrawal, regardless of age. This makes the net zakatable amount higher than a comparable 401(k). Set the penalty rate to 0% for 457(b) accounts.',
      sources: ['IRS_457B', 'IRS_RETIREMENT'] as SourceKey[],
    },
    {
      question: 'What about SIMPLE IRAs?',
      answer:
        'SIMPLE IRAs have a 25% early-withdrawal penalty (instead of 10%) if you withdraw within the first 2 years of participation. After 2 years, the standard 10% applies. Update the penalty rate field accordingly.',
      sources: ['IRS_SIMPLE_IRA', 'IRS_RETIREMENT'] as SourceKey[],
    },
    {
      question: 'How is Zakat handled for Pensions / Defined Benefit plans?',
      answer:
        'Scholars differ on pension Zakat. Two common views: (1) Pay annually on the estimated net withdrawable amount. (2) Defer Zakat until funds are accessible, then pay on the total balance including past years. Recording the balance is recommended regardless.',
      sources: ['FIQH_COUNCIL', 'AMAZON'] as SourceKey[],
    },
    {
      question: 'When are funds considered "accessible"?',
      answer:
        'Funds are accessible if you are age 59½ or older, have already withdrawn them, or qualify for a penalty exception (disability, first-time home purchase for IRA, Rule of 55 for 401k, etc.). Toggle "Funds accessible now" on the account card to remove the early-withdrawal penalty from your Zakat calculation.',
      sources: ['IRS_RETIREMENT', 'BANKRATE_RETIREMENT', 'FIDELITY_RETIREMENT'] as SourceKey[],
    },
    {
      question: 'Do retirement accounts need to meet the Hawl requirement?',
      answer:
        'Yes. The Fiqh Council of North America holds that retirement accounts must meet the one-year ownership (Hawl) requirement. Since most retirement accounts are held for many years, Hawl is generally considered met.',
      sources: ['FIQH_COUNCIL', 'AMAZON'] as SourceKey[],
    },
  ],
  sources: [
    'FIQH_COUNCIL',
    'AMAZON',
    'IRS_RETIREMENT',
    'IRS_PUB_590B',
    'IRS_457B',
    'IRS_SIMPLE_IRA',
    'VANGUARD_RETIREMENT',
    'BANKRATE_RETIREMENT',
    'SCHWAB_RETIREMENT',
    'FIDELITY_RETIREMENT',
  ] as SourceKey[],
}

// ─── Grand total footer helpers ──────────────────────────────────────────────

function netZakatable(account: RetirementAccount): number {
  const meta = RETIREMENT_ACCOUNT_META[account.accountType]
  if (meta.isLocked && !account.isAccessible) return 0
  const bal = account.balance
  if (!meta.zakatOnNet) return bal
  return Math.max(0, bal * (1 - account.taxRate / 100 - account.penaltyRate / 100))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RetirementCalculator({
  currency,
  onUpdateValues,
  onHawlUpdate,
  onCalculatorChange,
  onOpenSummary,
}: CalculatorProps) {
  const {
    retirement: retirementValues,
    retirementHawlMet,
    setRetirementHawlMet,
    resetRetirement,
    addRetirementAccount,
    removeRetirementAccount,
    updateRetirementAccount,
  } = useZakatStore()

  const isHydrated = useStoreHydration()
  const formatCurrency = (v: number) => formatCurrencyBase(v, currency)

  // Retirement always counts as hawl met
  useEffect(() => {
    setRetirementHawlMet(true)
    onHawlUpdate(true)
  }, [setRetirementHawlMet, onHawlUpdate])

  // Push totals up whenever accounts change
  useEffect(() => {
    if (!isHydrated) return
    const total = retirementAsset.calculateTotal(retirementValues)
    const zakatable = retirementAsset.calculateZakatable(retirementValues, undefined, retirementHawlMet)
    onUpdateValues({
      traditional_401k: retirementValues.traditional_401k || 0,
      traditional_ira: retirementValues.traditional_ira || 0,
      roth_401k: retirementValues.roth_401k || 0,
      roth_ira: retirementValues.roth_ira || 0,
      pension: retirementValues.pension || 0,
      other_retirement: retirementValues.other_retirement || 0,
      total_retirement_value: total,
      zakatable_retirement_value: zakatable,
    })
  }, [retirementValues, retirementHawlMet, isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset handler
  const handleStoreReset = useCallback(() => {
    resetRetirement()
    onUpdateValues({
      traditional_401k: 0,
      traditional_ira: 0,
      roth_401k: 0,
      roth_ira: 0,
      pension: 0,
      other_retirement: 0,
      total_retirement_value: 0,
      zakatable_retirement_value: 0,
    })
  }, [onUpdateValues, resetRetirement])

  useCalculatorReset(isHydrated, handleStoreReset)

  // Aggregate totals for the footer
  const accounts = retirementValues.retirementAccounts || []
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalZakatable = accounts.reduce((s, a) => s + netZakatable(a), 0)
  const totalZakatDue = totalZakatable * 0.025
  const hasLocked = accounts.some(
    (a) => RETIREMENT_ACCOUNT_META[a.accountType].isLocked && !a.isAccessible
  )

  return (
    <div className="space-y-6">
      {/* FAQ / Help */}
      <FAQ
        title="Retirement Accounts"
        description="Add each retirement account. Select the account type — the app will set the right default tax and penalty rates and explain how Zakat is calculated for that account."
        items={RETIREMENT_FAQ}
        defaultOpen={false}
      />

      {/* Account list */}
      <AnimatePresence mode="popLayout">
        {accounts.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400"
          >
            No retirement accounts yet — add one below.
          </motion.div>
        )}

        {accounts.map((account) => (
          <RetirementAccountCard
            key={account.id}
            account={account}
            currency={currency}
            onRemove={() => removeRetirementAccount(account.id)}
            onUpdate={(updates) => updateRetirementAccount(account.id, updates)}
          />
        ))}
      </AnimatePresence>

      {/* Add account button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed"
        onClick={() => addRetirementAccount('traditional_401k')}
      >
        <Plus className="h-4 w-4" />
        Add Retirement Account
      </Button>

      {/* Grand total footer */}
      <AnimatePresence>
        {totalBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-gray-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="space-y-0.5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">All Accounts</p>
              <p className="text-lg font-semibold">{formatCurrency(totalBalance)}</p>
              {hasLocked && (
                <p className="text-xs text-amber-400">* Some accounts are deferred</p>
              )}
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400">Net Zakatable</p>
                <p className="font-medium">{formatCurrency(totalZakatable)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Zakat due (2.5%)</p>
                <p className="font-semibold text-emerald-400">{formatCurrency(totalZakatDue)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <CalculatorNav
        currentCalculator="retirement"
        onCalculatorChange={onCalculatorChange}
        onOpenSummary={onOpenSummary}
      />
    </div>
  )
}