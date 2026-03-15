import { createCalculatorValidation } from '../templates/calculatorValidation'
import { MetalsValues } from '@/store/types'
import '@testing-library/jest-dom'

describe('Metals Calculator Validation', () => {
  // Mock console.error to prevent test output noise
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const metalsValidation = createCalculatorValidation<MetalsValues>({
    name: 'Metals Calculator',
    requiredFields: [
      'gold_investment',
      'gold_investment_purity',
      'gold_investment_input_mode',
      'gold_investment_value',
      'silver_investment',
      'silver_investment_input_mode',
      'silver_investment_value'
    ],
    numericalFields: [
      'gold_investment',
      'gold_investment_value',
      'silver_investment',
      'silver_investment_value'
    ]
  })

  describe('validateValues', () => {
    it('should validate valid metals values', () => {
      const validValues: MetalsValues = {
        gold_investment: 100,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 1000,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateValues(validValues)).toBe(true)
    })

    it('should validate zero values', () => {
      const zeroValues: MetalsValues = {
        gold_investment: 0,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 0,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateValues(zeroValues)).toBe(true)
    })

    it('should reject negative values', () => {
      const negativeValues: MetalsValues = {
        gold_investment: -100,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 1000,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateValues(negativeValues)).toBe(false)
    })

    it('should reject missing required fields', () => {
      const missingFields: Partial<MetalsValues> = {
        gold_investment: 100,
        gold_investment_purity: '24K'
        // Missing other required fields
      }

      expect(metalsValidation.validateValues(missingFields as MetalsValues)).toBe(false)
    })

    it('should reject non-numeric values', () => {
      const invalidTypes = {
        gold_investment: '100' as any,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 1000,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateValues(invalidTypes as any)).toBe(false)
    })
  })

  describe('validateCalculations', () => {
    it('should validate matching totals', () => {
      const total = 1100 // Total grams
      const breakdown = {
        items: {
          gold_investment: { value: 100, weight: 100 },
          silver_investment: { value: 1000, weight: 1000 }
        }
      }

      expect(metalsValidation.validateCalculations(total, breakdown)).toBe(true)
    })

    it('should reject mismatched totals', () => {
      const total = 2000 // Incorrect total
      const breakdown = {
        items: {
          gold_investment: { value: 100, weight: 100 },
          silver_investment: { value: 1000, weight: 1000 }
        }
      }

      expect(metalsValidation.validateCalculations(total, breakdown)).toBe(false)
    })

    it('should handle floating point weights correctly', () => {
      const total = 40.05
      const breakdown = {
        items: {
          gold_investment: { value: 25.05, weight: 25.05 },
          silver_investment: { value: 15, weight: 15 }
        }
      }

      expect(metalsValidation.validateCalculations(total, breakdown)).toBe(true)
    })
  })

  describe('validateZakatableAmount', () => {
    it('should validate when hawl is met', () => {
      const values: MetalsValues = {
        gold_investment: 100,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 1000,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateZakatableAmount(values, true)).toBe(true)
    })

    it('should validate when hawl is not met', () => {
      const values: MetalsValues = {
        gold_investment: 100,
        gold_investment_purity: '24K',
        gold_investment_input_mode: 'weight',
        gold_investment_value: 0,
        silver_investment: 1000,
        silver_investment_input_mode: 'weight',
        silver_investment_value: 0
      }

      expect(metalsValidation.validateZakatableAmount(values, false)).toBe(true)
    })
  })
}) 