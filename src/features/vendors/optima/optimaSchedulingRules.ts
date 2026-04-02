import type { VendorSchedulingRules } from '../shared/vendorScheduling/types'

export const optimaSchedulingRules: VendorSchedulingRules = {
  vendorId: 'optima',
  vendorDisplayName: 'Optima',
  validDeliveryDays: ['thursday'],
  validOrderDays: ['sunday', 'monday'],
  invalidDateStrategy: 'suggest_next_valid_date',
}
