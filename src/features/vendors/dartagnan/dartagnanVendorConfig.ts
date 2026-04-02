import type { VendorPlatformConfig } from '../shared/vendorConfig'

/** Shown under checklist quick actions (standing / recurring commitments). */
export const dartagnanStandingOrderHint =
  'Including standing: Lamb Racks (Tue 1 cs / Fri 2 cs)'

export const dartagnanPlatformConfig: VendorPlatformConfig = {
  id: 'dartagnan',
  settings: {
    profile: {
      displayName: "D'Artagnan",
      category: 'Meat',
      contactValue: '+12125551234',
    },
    orderCadence: {
      orderDays: ['Sunday'],
      availableDeliveryDays: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ],
      preferredDeliveryDays: ['Tuesday', 'Friday'],
      orderMinimum: '',
      orderCutOffTime: '',
    },
    orderPlacement: {
      method: 'sms',
      destination: '+12125551234',
    },
    capabilities: {
      supportsAddOns: false,
      supportsStandingOrders: true,
      supportsHistorySuggestions: true,
    },
  },
  lastKnownOrderDate: '2026-03-27',
}
