import type { VendorPlatformConfig } from '../shared/vendorConfig'
import { optimaRules } from './optimaRules'

export const optimaPlatformConfig: VendorPlatformConfig = {
  id: 'optima',
  settings: {
    profile: {
      displayName: 'Optima',
      category: 'Greek Imports',
      contactValue: '+19173242040',
    },
    orderCadence: {
      orderDays: [...optimaRules.orderDays],
      availableDeliveryDays: [...optimaRules.deliveryDays],
      preferredDeliveryDays: [...optimaRules.deliveryDays],
      orderMinimum: '',
      orderCutOffTime: '',
    },
    orderPlacement: {
      method: 'sms',
      destination: '+19173242040',
    },
    capabilities: {
      supportsAddOns: optimaRules.allowsAddOns,
      supportsStandingOrders: false,
      supportsHistorySuggestions: true,
    },
  },
  lastKnownOrderDate: '2026-03-09',
}

export { optimaRules }
