import type { VendorPlatformConfig } from '../shared/vendorConfig'
import { aceEndicoRules } from './aceEndicoRules'

export const aceEndicoPlatformConfig: VendorPlatformConfig = {
  id: 'ace-endico',
  settings: {
    profile: {
      displayName: 'Ace / Endico',
      category: 'Dry Goods & Dairy',
      contactValue: '+19084829316',
    },
    orderCadence: {
      orderDays: [...aceEndicoRules.orderDays],
      availableDeliveryDays: [...aceEndicoRules.deliveryDays],
      preferredDeliveryDays: [...aceEndicoRules.deliveryDays],
      orderMinimum: '',
      orderCutOffTime: '',
    },
    orderPlacement: {
      method: 'sms',
      destination: '+19084829316',
    },
    capabilities: {
      supportsAddOns: aceEndicoRules.allowsAddOns,
      supportsStandingOrders: false,
      supportsHistorySuggestions: true,
    },
  },
  lastKnownOrderDate: '2025-12-08',
}

export { aceEndicoRules }
