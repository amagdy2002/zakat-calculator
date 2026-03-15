import { createCalculatorValidation } from '../templates/calculatorValidation'
import { MetalsValues } from '@/store/types'

// Validate investment metal fields only
export const metalsValidation = createCalculatorValidation<MetalsValues>({
  name: 'Metals Calculator',
  requiredFields: [
    'gold_investment',
    'silver_investment'
  ],
  numericalFields: [
    'gold_investment',
    'gold_investment_value',
    'silver_investment',
    'silver_investment_value'
  ],
  customValidation: (values: MetalsValues) => {
    return Object.entries(values).every(([key, value]) => {
      if (typeof value === 'number') {
        const decimalPlaces = (value.toString().split('.')[1] || '').length
        return decimalPlaces <= 6 // ounce conversions need more precision
      }
      return true
    })
  }
})