import { Source } from '@/components/ui/sources'

export const SOURCES = {
  WIKIPEDIA: {
    id: 'wikipedia',
    name: 'Wikipedia',
    icon: '/sources/wikipedia.svg',
    url: 'https://www.wikipedia.org'
  },
  WZO: {
    id: 'wzo',
    name: 'World Zakat Organization',
    icon: '/sources/wzo.svg',
    url: 'https://worldzakatforum.org'
  },
  IFE: {
    id: 'ife',
    name: 'Islamic Finance Expert',
    icon: '/sources/ife.svg',
    url: 'https://www.islamicfinanceexpert.com'
  },
  AMAZON: {
    id: 'amazon',
    name: 'Simple Zakat Guide on Amazon',
    icon: '',
    url: 'https://www.amazon.com/Simple-Zakat-Guide-Understand-Calculate/dp/0996519246'
  },
  IFG: {
    id: 'ifg',
    name: '[1] Islamic Finance Guru - Property Zakat Guide',
    icon: '',
    url: 'https://www.islamicfinanceguru.com/articles/calculate-zakat-on-property-btl-and-family-home'
  },
  NZF: {
    id: 'nzf',
    name: '[2] National Zakat Foundation - Property Zakat Guide',
    icon: '',
    url: 'https://nzf.org.uk/knowledge/zakat-on-property/'
  },
  LAUNCHGOOD: {
    id: 'launchgood',
    name: '[3] LaunchGood - Zakat Guide',
    icon: '',
    url: 'https://www.launchgood.com/v4/blog/zakat-cash-property-investments'
  },
  FIQH_COUNCIL: {
    id: 'fiqh_council',
    name: 'Fiqh Council of North America',
    icon: '',
    url: 'https://fiqhcouncil.org/zakah-on-retirement-funds/'
  },
  BARAKAH_CAPITAL: {
    id: 'barakah_capital',
    name: 'Barakah Capital - Zakat on Gold & Silver',
    icon: '',
    url: 'https://barakahcapital.org/zakat-on-gold-and-silver-jewellery-a-comprehensive-guide/'
  },
  JOE_BRADFORD: {
    id: 'joe_bradford',
    name: 'Joe Bradford - Nisab Guide',
    icon: '',
    url: 'https://joebradford.net/nisab-for-zakat-on-gold-and-silver/'
  },
  ISLAMIC_RELIEF: {
    id: 'islamic_relief',
    name: 'Islamic Relief - Zakat FAQ',
    icon: '',
    url: 'https://islamic-relief.org/zakat-faq/'
  },
  NZF_CANADA: {
    id: 'nzf_canada',
    name: 'NZF Canada - Zakat on Debts',
    icon: '',
    url: 'https://www.nzfcanada.com/zakat-faq/zakat-on-debts-how-to-handle-owed-money-and-its-impact-on-zakat-calculation'
  },
  UM_RELIEF: {
    id: 'um_relief',
    name: 'UM Relief - Zakat with Loans',
    icon: '',
    url: 'https://www.umrelief.org/do-you-pay-zakat-if-you-have-loans/'
  },
  NZF_UK: {
    id: 'nzf_uk',
    name: 'NZF UK - Deductible Liabilities',
    icon: '',
    url: 'https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/'
  },
  IRS_RETIREMENT: {
    id: 'irs_retirement',
    name: '[1] IRS - Retirement Topics: Early Distributions',
    icon: '',
    url: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-tax-on-early-distributions'
  },
  IRS_PUB_590B: {
    id: 'irs_pub_590b',
    name: '[2] IRS Publication 590-B: Distributions from IRAs',
    icon: '',
    url: 'https://www.irs.gov/publications/p590b'
  },
  IRS_457B: {
    id: 'irs_457b',
    name: '[3] IRS - 457(b) Deferred Compensation Plans',
    icon: '',
    url: 'https://www.irs.gov/retirement-plans/irc-457b-deferred-compensation-plans'
  },
  VANGUARD_RETIREMENT: {
    id: 'vanguard_retirement',
    name: '[4] Vanguard - Early Withdrawal Penalties',
    icon: '',
    url: 'https://investor.vanguard.com/investor-resources-education/iras/early-withdrawal-penalties'
  },
  BANKRATE_RETIREMENT: {
    id: 'bankrate_retirement',
    name: '[5] Bankrate - 401(k) Withdrawal Rules',
    icon: '',
    url: 'https://www.bankrate.com/retirement/401-k-withdrawal-rules-how-to-avoid-penalties/'
  },
  SCHWAB_RETIREMENT: {
    id: 'schwab_retirement',
    name: '[6] Charles Schwab - Retirement Account Comparison',
    icon: '',
    url: 'https://www.schwab.com/ira/roth-vs-traditional-ira'
  },
  FIDELITY_RETIREMENT: {
    id: 'fidelity_retirement',
    name: '[7] Fidelity - Retirement Account Types',
    icon: '',
    url: 'https://www.fidelity.com/retirement-ira/overview'
  },
  IRS_SIMPLE_IRA: {
    id: 'irs_simple_ira',
    name: '[8] IRS - SIMPLE IRA Plan',
    icon: '',
    url: 'https://www.irs.gov/retirement-plans/simple-ira-plan'
  }
} as const

export type SourceKey = keyof typeof SOURCES 