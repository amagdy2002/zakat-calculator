'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, InfoIcon } from 'lucide-react'
import { Input } from '@/components/ui/form/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/form/switch'
import {
    RetirementAccount,
    RetirementAccountType,
    RETIREMENT_ACCOUNT_META,
} from '@/store/modules/retirement.types'

// ─── Account type groups for the Select dropdown ──────────────────────────────

const ACCOUNT_TYPE_GROUPS: { label: string; types: RetirementAccountType[] }[] = [
    {
        label: 'Employer-Sponsored (Pre-Tax)',
        types: ['traditional_401k', 'traditional_403b', '457b'],
    },
    {
        label: 'Employer-Sponsored (Roth / After-Tax)',
        types: ['roth_401k', 'roth_403b'],
    },
    {
        label: 'Individual (IRA)',
        types: ['traditional_ira', 'roth_ira', 'sep_ira', 'simple_ira'],
    },
    {
        label: 'Precious Metals',
        types: ['precious_metals'],
    },
    {
        label: 'Other',
        types: ['pension', 'after_tax', 'other'],
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string) {
    if (!isFinite(value)) return `${currency} 0.00`
    return value.toLocaleString(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function netZakatable(account: RetirementAccount): number {
    const meta = RETIREMENT_ACCOUNT_META[account.accountType]
    if (meta.isLocked && !account.isAccessible) return 0
    const metals = account.preciousMetals || 0
    const cash = account.cash || 0

    let grossZakatable = 0
    let totalInvestmentValue = 0

    if (account.treatment === 'investment') {
        const active = account.active || 0
        const passive = account.passive || 0
        const dividends = account.dividends || 0
        grossZakatable = active + (passive * 0.3) + dividends
        totalInvestmentValue = active + passive + dividends
    } else {
        if (account.isTaxDifferentiated) {
            grossZakatable = (account.principal || 0) + (account.gains || 0)
        } else {
            grossZakatable = account.balance || 0
        }
    }

    grossZakatable += metals + cash

    let netInvestment = grossZakatable
    if (meta.zakatOnNet) {
        if (account.isTaxDifferentiated) {
            const gains = account.gains || 0
            const taxFactor = ((account.taxRate || 0) / 100) + ((account.penaltyRate || 0) / 100)
            const taxOnGains = gains * taxFactor
            netInvestment -= taxOnGains
        } else {
            const taxFactor = ((account.taxRate || 0) / 100) + ((account.penaltyRate || 0) / 100)
            netInvestment *= (1 - taxFactor)
        }
    }
    
    return Math.max(0, netInvestment)
}

// ─── TaxBadge ─────────────────────────────────────────────────────────────────

function TaxBadge({ treatment }: { treatment: string }) {
    const styles: Record<string, string> = {
        pre_tax: 'bg-amber-50 text-amber-700 border-amber-200',
        after_tax: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        roth: 'bg-blue-50 text-blue-700 border-blue-200',
        exempt: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    const labels: Record<string, string> = {
        pre_tax: 'Pre-tax',
        after_tax: 'After-tax',
        roth: 'Roth',
        exempt: 'Locked',
    }
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[treatment] || styles.pre_tax}`}
        >
            {labels[treatment] || treatment}
        </span>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    account: RetirementAccount
    currency: string
    onRemove: () => void
    onUpdate: (updates: Partial<Omit<RetirementAccount, 'id'>>) => void
}

export function RetirementAccountCard({ account, currency, onRemove, onUpdate }: Props) {
    const [expanded, setExpanded] = useState(true)
    const [nameInput, setNameInput] = useState(account.name)
    const [balanceInput, setBalanceInput] = useState(
        account.balance > 0 ? String(account.balance) : ''
    )
    const [metalsInput, setMetalsInput] = useState(
        account.preciousMetals > 0 ? String(account.preciousMetals) : ''
    )
    const [cashInput, setCashInput] = useState(
        account.cash > 0 ? String(account.cash) : ''
    )

    const meta = RETIREMENT_ACCOUNT_META[account.accountType]
    const net = netZakatable(account)
    const zakatDue = net * 0.025
    const isLocked = meta.isLocked && !account.isAccessible

    function handleTypeChange(type: RetirementAccountType) {
        const newMeta = RETIREMENT_ACCOUNT_META[type]
        onUpdate({
            accountType: type,
            taxRate: newMeta.defaultTaxRate,
            penaltyRate: newMeta.defaultPenaltyRate,
            isAccessible: !newMeta.isLocked,
        })
    }

    function handleInputBlur(field: keyof RetirementAccount, value: string) {
        const raw = parseFloat(value.replace(/,/g, ''))
        const val = isFinite(raw) && raw >= 0 ? raw : 0
        onUpdate({ [field]: val })
    }

    // Accessible toggle: when user marks as accessible, clear penalty
    function handleAccessibleToggle(checked: boolean) {
        onUpdate({
            isAccessible: checked,
            penaltyRate: checked ? 0 : meta.defaultPenaltyRate,
        })
    }

    function getAccountTotalVal() {
        let val = 0
        if (account.treatment === 'investment') {
            val = (account.active || 0) + (account.passive || 0) + (account.dividends || 0)
        } else {
            val = account.isTaxDifferentiated ? (account.principal || 0) + (account.gains || 0) : (account.balance || 0)
        }
        return val + (account.preciousMetals || 0) + (account.cash || 0)
    }
    const totalValue = getAccountTotalVal()

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
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onBlur={() => onUpdate({ name: nameInput.trim() || '' })}
                        placeholder={`Account name (e.g. Fidelity ${meta.shortLabel})`}
                        className="w-full text-sm font-medium bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                        <TaxBadge treatment={meta.taxTreatment} />
                        {totalValue > 0 && (
                            <span className="text-xs text-gray-400">
                                {isLocked ? 'Deferred' : `Net ${fmt(net, currency)}`}
                            </span>
                        )}
                    </div>
                </div>

                {totalValue > 0 && (
                    <div className="text-right hidden sm:block shrink-0">
                        <p className="text-xs text-gray-400">Total Value</p>
                        <p className="text-sm font-semibold text-gray-900">{fmt(totalValue, currency)}</p>
                    </div>
                )}

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
                        <div className="px-4 py-4 space-y-5">
                            {/* Account type + balance row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Account type */}
                                <div className="space-y-1.5 min-w-[200px] flex-1">
                                    <Label className="text-xs font-medium text-gray-700">Account Type</Label>
                                    <Select value={account.accountType} onValueChange={handleTypeChange}>
                                        <SelectTrigger className="text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACCOUNT_TYPE_GROUPS.map((group) => (
                                                <SelectGroup key={group.label}>
                                                    <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                                                        {group.label}
                                                    </div>
                                                    {group.types.map((type) => (
                                                        <SelectItem key={type} value={type} className="text-sm">
                                                            {RETIREMENT_ACCOUNT_META[type].label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Treatment toggles */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-700">Treatment</Label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => onUpdate({ treatment: 'cash' })}
                                            className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${account.treatment === 'cash' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => onUpdate({ treatment: 'investment' })}
                                            className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${account.treatment === 'investment' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Investment
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Investment specific rows */}
                            {account.treatment === 'investment' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-700">Active (100% Zakat)</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-xs font-medium text-gray-500">{currency}</span>
                                            </div>
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                className="pl-12 text-sm"
                                                value={account.active || ''}
                                                onChange={(e) => onUpdate({ active: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-700">Passive (30% Zakat)</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-xs font-medium text-gray-500">{currency}</span>
                                            </div>
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                className="pl-12 text-sm"
                                                value={account.passive || ''}
                                                onChange={(e) => onUpdate({ passive: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-700">Dividends (100%)</Label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-xs font-medium text-gray-500">{currency}</span>
                                            </div>
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                className="pl-12 text-sm"
                                                value={account.dividends || ''}
                                                onChange={(e) => onUpdate({ dividends: parseFloat(e.target.value) || 0 })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cash or simple balance */}
                            {account.treatment === 'cash' && !account.isTaxDifferentiated && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-gray-700">Account Balance</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm"
                                            value={balanceInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setBalanceInput(v)
                                            }}
                                            onBlur={() => handleInputBlur('balance', balanceInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tax Differentiated Toggle & Inputs */}
                            {account.treatment === 'cash' && (meta.taxTreatment === 'roth' || meta.taxTreatment === 'after_tax') && (
                                <div className="border border-indigo-100 rounded-lg overflow-hidden bg-white">
                                    <div className="flex items-center justify-between p-3 bg-indigo-50/50">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-800">Tax Differentiate Balance?</span>
                                            <span className="text-xs text-gray-500">Split into Principal (Contributions) vs Gains to accurately apply taxes. Useful for Roth.</span>
                                        </div>
                                        <Switch
                                            checked={account.isTaxDifferentiated}
                                            onCheckedChange={(checked) => onUpdate({ isTaxDifferentiated: checked })}
                                        />
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {account.isTaxDifferentiated && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.22, ease: [0.2, 0.4, 0.2, 1] }}
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50 border-t border-indigo-100">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-indigo-900">Principal (Contributions)</Label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                <span className="text-xs font-medium text-indigo-500">{currency}</span>
                                                            </div>
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="pl-12 text-sm border-indigo-200 bg-white"
                                                                value={account.principal || ''}
                                                                onChange={(e) => onUpdate({ principal: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-indigo-900">Gains (Earnings)</Label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                <span className="text-xs font-medium text-indigo-500">{currency}</span>
                                                            </div>
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="pl-12 text-sm border-indigo-200 bg-white"
                                                                value={account.gains || ''}
                                                                onChange={(e) => onUpdate({ gains: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}



                            {/* Second row: Precious Metals + Cash */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Precious Metals */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <Label htmlFor={`metals-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Precious Metals (100%)
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`metals-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm border-amber-100 focus:border-amber-300 focus:ring-amber-100"
                                            value={metalsInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setMetalsInput(v)
                                            }}
                                            onBlur={() => handleInputBlur('preciousMetals', metalsInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Cash */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                        <Label htmlFor={`cash-${account.id}`} className="text-xs font-medium text-gray-700">
                                            Cash Holdings (100%)
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-medium text-gray-500">{currency}</span>
                                        </div>
                                        <Input
                                            id={`cash-${account.id}`}
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-12 text-sm border-teal-100 focus:border-teal-300 focus:ring-teal-100"
                                            value={cashInput}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                if (/^[\d.,]*$/.test(v) || v === '') setCashInput(v)
                                            }}
                                            onBlur={() => handleInputBlur('cash', cashInput)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tax note info box */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                                <InfoIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                                <div>
                                    <span className="font-medium text-gray-700">Tax & Penalty: </span>
                                    {meta.taxNote}
                                </div>
                            </div>

                            {/* Accessible toggle (skip for locked-by-nature like pension) */}
                            {!meta.isLocked && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Funds accessible now?</p>
                                        <p className="text-xs text-gray-400">
                                            Age ≥ 59½, already withdrawn, or eligible exception
                                        </p>
                                    </div>
                                    <Switch
                                        checked={account.isAccessible}
                                        onCheckedChange={handleAccessibleToggle}
                                    />
                                </div>
                            )}

                            {/* Tax / penalty sliders — show for non-locked or accessible locked */}
                            {(!meta.isLocked || meta.taxTreatment !== 'exempt') && (
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Tax rate */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Label htmlFor={`tax-${account.id}`} className="text-xs font-medium text-gray-700">
                                                Est. Tax Rate
                                            </Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <InfoIcon className="h-3 w-3 text-gray-400" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs text-xs">
                                                            Federal marginal income tax rate you expect to pay on this withdrawal.
                                                            Common brackets: 10%, 12%, 22%, 24%, 32%, 35%, 37%.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id={`tax-${account.id}`}
                                                type="number"
                                                min={0}
                                                max={50}
                                                step={1}
                                                className="pr-8 text-sm"
                                                value={account.taxRate || ''}
                                                onChange={(e) =>
                                                    onUpdate({ taxRate: parseFloat(e.target.value) || 0 })
                                                }
                                                placeholder={String(meta.defaultTaxRate)}
                                                disabled={meta.taxTreatment === 'roth' || meta.taxTreatment === 'after_tax'}
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                <span className="text-xs text-gray-500">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Penalty rate */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Label htmlFor={`penalty-${account.id}`} className="text-xs font-medium text-gray-700">
                                                Early Penalty
                                            </Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <InfoIcon className="h-3 w-3 text-gray-400" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs text-xs">
                                                            {meta.defaultPenaltyRate === 0
                                                                ? 'No early-withdrawal penalty applies to this account type.'
                                                                : `Default is ${meta.defaultPenaltyRate}% for this account type. Set to 0 if you qualify for an exception.`}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id={`penalty-${account.id}`}
                                                type="number"
                                                min={0}
                                                max={30}
                                                step={1}
                                                className="pr-8 text-sm"
                                                value={account.isAccessible ? 0 : (account.penaltyRate || '')}
                                                onChange={(e) =>
                                                    onUpdate({ penaltyRate: parseFloat(e.target.value) || 0 })
                                                }
                                                placeholder={String(account.isAccessible ? 0 : meta.defaultPenaltyRate)}
                                                disabled={
                                                    account.isAccessible ||
                                                    meta.taxTreatment === 'roth' ||
                                                    meta.taxTreatment === 'after_tax' ||
                                                    meta.defaultPenaltyRate === 0
                                                }
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                <span className="text-xs text-gray-500">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Per-account mini summary */}
                            {(account.balance > 0 || account.preciousMetals > 0 || account.cash > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-gray-500 border-t border-gray-100"
                                >
                                    <span>
                                        Total:{' '}
                                        <span className="font-medium text-gray-800">{fmt(totalValue, currency)}</span>
                                    </span>
                                    {account.preciousMetals > 0 && (
                                        <>
                                            <span>·</span>
                                            <span>
                                                Metals: <span className="font-medium text-gray-800">{fmt(account.preciousMetals, currency)}</span>
                                            </span>
                                        </>
                                    )}
                                    {account.cash > 0 && (
                                        <>
                                            <span>·</span>
                                            <span>
                                                Cash: <span className="font-medium text-gray-800">{fmt(account.cash, currency)}</span>
                                            </span>
                                        </>
                                    )}
                                    <span>·</span>
                                    {isLocked ? (
                                        <span className="text-amber-600 font-medium">
                                            Zakat deferred (locked account)
                                        </span>
                                    ) : (
                                        <>
                                            <span>
                                                Net zakatable:{' '}
                                                <span className="font-medium text-gray-800">{fmt(net, currency)}</span>
                                            </span>
                                            <span>·</span>
                                            <span>
                                                Zakat due:{' '}
                                                <span className="font-semibold text-emerald-600">{fmt(zakatDue, currency)}</span>
                                            </span>
                                        </>
                                    )}

                                    <span className="w-full mt-0.5 text-[10px] text-gray-400 italic">
                                        {meta.zakatNote}
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
