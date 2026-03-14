/**
 * Retirement account type definitions and tax/penalty metadata.
 *
 * Tax treatment rules (US, 2024):
 * - Traditional (pre-tax) accounts: income tax + 10% early withdrawal penalty if < 59½
 * - Roth accounts: contributions withdrawable anytime tax/penalty-free; EARNINGS taxed + 10% penalty if early
 * - 457(b): no 10% penalty ever; only income tax on withdrawal
 * - Pension: employer-funded locked fund; Zakat is generally deferred until accessible
 * - After-tax / Brokerage: already taxed; full balance zakatable
 */

export type RetirementAccountType =
    | 'traditional_401k'
    | 'roth_401k'
    | 'traditional_403b'
    | 'roth_403b'
    | 'traditional_ira'
    | 'roth_ira'
    | 'sep_ira'
    | 'simple_ira'
    | 'pension'
    | '457b'
    | 'after_tax'
    | 'other'

export type TaxTreatment = 'pre_tax' | 'after_tax' | 'roth' | 'exempt'

export interface RetirementAccountMeta {
    label: string
    shortLabel: string
    taxTreatment: TaxTreatment
    /** Default income tax rate to apply on withdrawal (user can override) */
    defaultTaxRate: number
    /** Default early-withdrawal penalty rate (0 if none) */
    defaultPenaltyRate: number
    /** Whether Zakat is based on net (after tax+penalty) or gross amount */
    zakatOnNet: boolean
    /** Whether the account is generally inaccessible / Zakat deferred */
    isLocked: boolean
    /** Short description of withdrawal tax/penalty rules */
    taxNote: string
    /** Tooltip hint for Zakat treatment */
    zakatNote: string
}

export const RETIREMENT_ACCOUNT_META: Record<RetirementAccountType, RetirementAccountMeta> = {
    traditional_401k: {
        label: 'Traditional 401(k)',
        shortLabel: '401(k)',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 10,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Pre-tax contributions. Withdrawals taxed as ordinary income + 10% early-withdrawal penalty if under 59½.',
        zakatNote: 'Zakat is due on the net amount after estimated income tax and early-withdrawal penalty.',
    },
    roth_401k: {
        label: 'Roth 401(k)',
        shortLabel: 'Roth 401(k)',
        taxTreatment: 'roth',
        defaultTaxRate: 0,
        defaultPenaltyRate: 0,
        zakatOnNet: false,
        isLocked: false,
        taxNote: 'After-tax contributions. Qualified withdrawals (age ≥ 59½ + 5-year holding) are fully tax-free. Early earnings withdrawals subject to income tax + 10% penalty.',
        zakatNote: 'Contributions are zakatable at full value (already taxed). Earnings component is treated like traditional if withdrawn early.',
    },
    traditional_403b: {
        label: 'Traditional 403(b)',
        shortLabel: '403(b)',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 10,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Similar to 401(k). Pre-tax contributions for public school/nonprofit employees. Withdrawals taxed as income + 10% penalty if under 59½.',
        zakatNote: 'Zakat is due on the net amount after estimated income tax and early-withdrawal penalty.',
    },
    roth_403b: {
        label: 'Roth 403(b)',
        shortLabel: 'Roth 403(b)',
        taxTreatment: 'roth',
        defaultTaxRate: 0,
        defaultPenaltyRate: 0,
        zakatOnNet: false,
        isLocked: false,
        taxNote: 'After-tax contributions. Qualified withdrawals fully tax-free. Same early-withdrawal rules as Roth 401(k).',
        zakatNote: 'Contributions are zakatable at full value. Treat like Roth 401(k) for Zakat purposes.',
    },
    traditional_ira: {
        label: 'Traditional IRA',
        shortLabel: 'Traditional IRA',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 10,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Pre-tax (deductible) contributions. Withdrawals taxed as ordinary income + 10% penalty if under 59½. First-time home purchase and education expenses may be penalty-exempt.',
        zakatNote: 'Zakat is due on the net amount after estimated income tax and early-withdrawal penalty.',
    },
    roth_ira: {
        label: 'Roth IRA',
        shortLabel: 'Roth IRA',
        taxTreatment: 'roth',
        defaultTaxRate: 0,
        defaultPenaltyRate: 0,
        zakatOnNet: false,
        isLocked: false,
        taxNote: 'After-tax contributions. Contributions can be withdrawn anytime tax-free and penalty-free. Earnings withdrawn before age 59½ / 5-year rule are taxed + 10% penalty.',
        zakatNote: 'Zakat is due on contributions at full value (already taxed). No RMDs required — balance grows tax-free for heirs.',
    },
    sep_ira: {
        label: 'SEP IRA',
        shortLabel: 'SEP IRA',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 10,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Employer-funded pre-tax account for self-employed / small business owners. Same withdrawal rules as Traditional IRA: income tax + 10% penalty before 59½.',
        zakatNote: 'Zakat is due on the net amount after estimated income tax and early-withdrawal penalty.',
    },
    simple_ira: {
        label: 'SIMPLE IRA',
        shortLabel: 'SIMPLE IRA',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 25,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Small-business employee plan. Income tax applies on withdrawal. Early-withdrawal penalty is 25% (not 10%) if withdrawn within the first 2 years of participation; 10% thereafter.',
        zakatNote: 'Zakat is due on the net amount. Use the 25% penalty if within the first 2 years of the plan, otherwise 10%.',
    },
    pension: {
        label: 'Pension (Defined Benefit)',
        shortLabel: 'Pension',
        taxTreatment: 'exempt',
        defaultTaxRate: 0,
        defaultPenaltyRate: 0,
        zakatOnNet: false,
        isLocked: true,
        taxNote: 'Employer-funded defined-benefit plan. You typically cannot withdraw a lump sum before retirement. Distributions are paid as an annuity and taxed as ordinary income when received.',
        zakatNote: 'Scholars differ: either pay Zakat annually on the estimated net withdrawable amount, or defer Zakat until funds become accessible. Recording the balance is recommended.',
    },
    '457b': {
        label: '457(b)',
        shortLabel: '457(b)',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 0,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Government / non-profit deferred compensation plan. No 10% early-withdrawal penalty — only ordinary income tax applies on withdrawal, regardless of age.',
        zakatNote: 'Zakat is due on the net amount after estimated income tax only (no penalty applies to 457(b) plans).',
    },
    after_tax: {
        label: 'After-Tax / Brokerage',
        shortLabel: 'After-Tax',
        taxTreatment: 'after_tax',
        defaultTaxRate: 0,
        defaultPenaltyRate: 0,
        zakatOnNet: false,
        isLocked: false,
        taxNote: 'Contributions are made with already-taxed money. Capital gains tax may apply on earnings when sold, but the principal is not taxed again.',
        zakatNote: 'Full balance is zakatable — contributions were already taxed. Gains are included in the zakatable amount.',
    },
    other: {
        label: 'Other Retirement Account',
        shortLabel: 'Other',
        taxTreatment: 'pre_tax',
        defaultTaxRate: 22,
        defaultPenaltyRate: 10,
        zakatOnNet: true,
        isLocked: false,
        taxNote: 'Consult your plan documents for exact withdrawal rules. Default assumptions: ordinary income tax applies, plus a 10% penalty if under 59½.',
        zakatNote: 'Zakat is calculated on the estimated net amount after taxes and penalties.',
    },
}

export interface RetirementAccount {
    id: string
    name: string
    accountType: RetirementAccountType
    balance: number
    /** User-overridable tax rate (%) */
    taxRate: number
    /** User-overridable penalty rate (%) */
    penaltyRate: number
    /** true = funds can be accessed now without penalty (age ≥ 59½ or exempt) */
    isAccessible: boolean
}
