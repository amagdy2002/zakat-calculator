'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { StockAccount } from '@/lib/assets/stocks'
import { FAQ } from '@/components/ui/faq'
import { ASSET_FAQS } from '@/config/faqs'

const PASSIVE_FUND_RATE = 0.3

interface AccountsTabProps {
    currency: string
    accounts: StockAccount[]
    onAddAccount: () => void
    onRemoveAccount: (id: string) => void
    onUpdateAccount: (id: string, field: keyof Omit<StockAccount, 'id'>, value: string | number) => void
    hawlMet: boolean
}

function formatCurrency(value: number, currency: string): string {
    if (!isFinite(value)) return `${currency} 0.00`
    return value.toLocaleString(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function parseAmount(raw: string): number {
    const n = parseFloat(raw.replace(/,/g, ''))
    return isFinite(n) && n >= 0 ? n : 0
}

function AccountCard({
    account,
    currency,
    hawlMet,
    onRemove,
    onUpdate,
}: {
    account: StockAccount
    currency: string
    hawlMet: boolean
    onRemove: () => void
    onUpdate: (field: keyof Omit<StockAccount, 'id'>, value: string | number) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const [nameInput, setNameInput] = useState(account.name)
    const [activeInput, setActiveInput] = useState(account.active > 0 ? String(account.active) : '')
    const [passiveInput, setPassiveInput] = useState(account.passive > 0 ? String(account.passive) : '')
    const [dividendsInput, setDividendsInput] = useState(account.dividends > 0 ? String(account.dividends) : '')
    const [preciousMetalsInput, setPreciousMetalsInput] = useState(account.preciousMetals > 0 ? String(account.preciousMetals) : '')
    const [cashInput, setCashInput] = useState(account.cash > 0 ? String(account.cash) : '')

    const active = parseAmount(activeInput)
    const passive = parseAmount(passiveInput)
    const dividends = parseAmount(dividendsInput)
    const preciousMetals = parseAmount(preciousMetalsInput)
    const cash = parseAmount(cashInput)

    const totalValue = active + passive + dividends + preciousMetals + cash
    const zakatableValue = active + passive * PASSIVE_FUND_RATE + dividends + preciousMetals + cash
    const zakatDue = hawlMet ? zakatableValue * 0.025 : 0

    function handleNumericBlur(field: 'active' | 'passive' | 'dividends' | 'preciousMetals' | 'cash', raw: string) {
        const val = parseAmount(raw)
        onUpdate(field, val)
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.2, 0.4, 0.2, 1] }}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
            {/* Card header */}
            <div className="flex items-center px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={() => onUpdate('name', nameInput.trim() || `Account`)}
                        placeholder="Account name (e.g. Fidelity IRA)"
                        className="w-full text-sm font-medium bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                    />
                </div>

                {/* Mini totals */}
                {totalValue > 0 && (
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalValue, currency)}</p>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={onRemove}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove account"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Divider */}
            {expanded && <div className="border-t border-gray-100" />}

            {/* Collapsible body */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.4, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-4 space-y-4">
                            {/* Four input fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Active */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                        <Label htmlFor={`active-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Active Trading
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">100% zakatable</p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`active-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={activeInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setActiveInput(v)
                                            }}
                                            onBlur={() => handleNumericBlur('active', activeInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Passive */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                                        <Label htmlFor={`passive-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Passive / Long-term
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">30% zakatable</p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`passive-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={passiveInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setPassiveInput(v)
                                            }}
                                            onBlur={() => handleNumericBlur('passive', passiveInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Dividends */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-violet-400" />
                                        <Label htmlFor={`dividends-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Dividends
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">100% zakatable</p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`dividends-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={dividendsInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setDividendsInput(v)
                                            }}
                                            onBlur={() => handleNumericBlur('dividends', dividendsInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Precious Metals */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                                        <Label htmlFor={`precious-metals-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Precious Metals
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">100% zakatable</p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`precious-metals-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={preciousMetalsInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setPreciousMetalsInput(v)
                                            }}
                                            onBlur={() => handleNumericBlur('preciousMetals', preciousMetalsInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Cash Holdings */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
                                        <Label htmlFor={`cash-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Cash Holdings
                                        </Label>
                                    </div>
                                    <p className="text-xs text-gray-400">100% zakatable</p>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`cash-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={cashInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setCashInput(v)
                                            }}
                                            onBlur={() => handleNumericBlur('cash', cashInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Per-account mini summary */}
                            {totalValue > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-wrap gap-3 pt-1 text-xs text-gray-500 border-t border-gray-100"
                                >
                                    <span>
                                        Total: <span className="font-medium text-gray-800">{formatCurrency(totalValue, currency)}</span>
                                    </span>
                                    <span>·</span>
                                    <span>
                                        Zakatable:{' '}
                                        <span className="font-medium text-gray-800">{formatCurrency(zakatableValue, currency)}</span>
                                    </span>
                                    {hawlMet && (
                                        <>
                                            <span>·</span>
                                            <span>
                                                Zakat due:{' '}
                                                <span className="font-semibold text-emerald-600">{formatCurrency(zakatDue, currency)}</span>
                                            </span>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export function AccountsTab({
    currency,
    accounts,
    onAddAccount,
    onRemoveAccount,
    onUpdateAccount,
    hawlMet,
}: AccountsTabProps) {
    const totalValue = accounts.reduce((s, a) => s + a.active + a.passive + a.dividends + (a.preciousMetals || 0) + (a.cash || 0), 0)
    const zakatableValue = accounts.reduce(
        (s, a) => s + a.active + a.passive * PASSIVE_FUND_RATE + a.dividends + (a.preciousMetals || 0) + (a.cash || 0),
        0
    )
    const zakatDue = hawlMet ? zakatableValue * 0.025 : 0

    return (
        <div className="space-y-5">
            {/* Help / FAQ */}
            <FAQ
                title="Stocks & Investments"
                description="Add each brokerage or investment account. For each account, enter how much is actively traded (100% zakatable), held long-term / passively (30% zakatable), and received as dividends (100% zakatable)."
                items={{
                    items: [
                        ...ASSET_FAQS.stocks.active.items,
                        ...ASSET_FAQS.stocks.passive.items,
                        ...ASSET_FAQS.stocks.dividend.items,
                    ],
                    sources: ASSET_FAQS.stocks.sources,
                }}
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
                        No accounts yet — add one below.
                    </motion.div>
                )}

                {accounts.map((account) => (
                    <AccountCard
                        key={account.id}
                        account={account}
                        currency={currency}
                        hawlMet={hawlMet}
                        onRemove={() => onRemoveAccount(account.id)}
                        onUpdate={(field, value) => onUpdateAccount(account.id, field, value)}
                    />
                ))}
            </AnimatePresence>

            {/* Add account */}
            <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={onAddAccount}
            >
                <Plus className="h-4 w-4" />
                Add Account
            </Button>

            {/* Grand total footer */}
            <AnimatePresence>
                {totalValue > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl bg-gray-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                        <div className="space-y-0.5">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">All Accounts</p>
                            <p className="text-lg font-semibold">{formatCurrency(totalValue, currency)}</p>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div>
                                <p className="text-xs text-gray-400">Zakatable</p>
                                <p className="font-medium">{formatCurrency(zakatableValue, currency)}</p>
                            </div>
                            {hawlMet && (
                                <div>
                                    <p className="text-xs text-gray-400">Zakat due (2.5%)</p>
                                    <p className="font-semibold text-emerald-400">{formatCurrency(zakatDue, currency)}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
