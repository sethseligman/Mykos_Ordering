import type { VendorSchedulingRules } from '../shared/vendorScheduling/types'

export const dartagnanSchedulingRules: VendorSchedulingRules = {
  vendorId: 'dartagnan',
  vendorDisplayName: "D'Artagnan",
  vendorDeliveryDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  preferredDeliveryDays: ['tuesday', 'friday'],
  invalidDateStrategy: 'suggest_next_valid_date',
  standingOrderRules: {
    tuesday: [
      { itemId: 'lamb-racks', minimumQuantity: '1', unit: 'cs' },
    ],
    friday: [
      { itemId: 'lamb-racks', minimumQuantity: '2', unit: 'cs' },
    ],
  },
}
