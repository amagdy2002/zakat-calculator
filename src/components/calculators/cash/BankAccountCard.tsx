'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, Landmark } from 'lucide-react'
import { Input } from '@/components/ui/form/input'
import { Label } from '@/components/ui/label'
import { BankAccount } from '@/store/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string) {
    if (!isFinite(value) || value === 0) return null
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

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    account: BankAccount
    currency: string
    hawlMet: boolean
    onRemove: () => void
    onUpdate: (updates: Partial<Omit<BankAccount, 'id'>>) => void
}

export function BankAccountCard({ account, currency, hawlMet, onRemove, onUpdate }: Props) {
    const [expanded, setExpanded] = useState(true)
    const [nameInput, setNameInput] = useState(account.name)
    const [balanceInput, setBalanceInput] = useState(
        account.balance > 0 ? String(account.balance) : ''
    )

    const zakatDue = hawlMet ? account.balance * 0.025 : 0
    const formatted = fmt(account.balance, currency)
    const formattedZakat = fmt(zakatDue, currency)

    function handleBalanceBlur() {
        const val = parseAmount(balanceInput)
        onUpdate({ balance: val })
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
            {/* ── Card header ── */}
            <div className="flex items-center px-4 py-3 gap-3">
                {/* Bank icon */}
                <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Landmark className="h-4 w-4 text-violet-500" />
                </div>

                {/* Name input */}
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={() => onUpdate({ name: nameInput.trim() || 'Bank Account' })}
                        placeholder="Account name (e.g. Chase Checking)"
                        className="w-full text-sm font-medium bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                    />
                    {formatted && (
                        <p className="text-xs text-gray-400 mt-0.5">Balance: {formatted}</p>
                    )}
                </div>

                {/* Mini balance badge */}
                {formatted && (
                    <div className="text-right hidden sm:block shrink-0">
                        <p className="text-xs text-gray-400">Balance</p>
                        <p className="text-sm font-semibold text-gray-900">{formatted}</p>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setExpanded((v) => !v)}
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

            {expanded && <div className="border-t border-gray-100" />}

            {/* ── Collapsible body ── */}
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
                            {/* Balance input */}
                            <div className="space-y-1.5">
                                <Label htmlFor={`balance-${account.id}`} className="text-xs font-medium text-gray-700">
                                    Account Balance
                                </Label>
                                <div className="relative max-w-xs">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <span className="text-xs font-medium text-gray-500">{currency}</span>
                                    </div>
                                    <Input
                                        id={`balance-${account.id}`}
                                        type="text"
                                        inputMode="decimal"
                                        className="pl-12 text-sm"
                                        value={balanceInput}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            if (/^[\d.,]*$/.test(v) || v === '') setBalanceInput(v)
                                        }}
                                        onBlur={handleBalanceBlur}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Per-account mini summary */}
                            {account.balance > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-gray-500 border-t border-gray-100"
                                >
                                    <span>
                                        Balance:{' '}
                                        <span className="font-medium text-gray-800">{formatted}</span>
                                    </span>
                                    <span>·</span>
                                    <span>
                                        Zakatable:{' '}
                                        <span className="font-medium text-gray-800">
                                            {hawlMet ? formatted : '—'}
                                        </span>
                                    </span>
                                    {hawlMet && formattedZakat && (
                                        <>
                                            <span>·</span>
                                            <span>
                                                Zakat due:{' '}
                                                <span className="font-semibold text-emerald-600">{formattedZakat}</span>
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
