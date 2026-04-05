export type OrderPlacementMethod = 'sms' | 'email' | 'portal' | 'other'

export type VendorCapabilities = {
  supportsAddOns: boolean
  supportsStandingOrders: boolean
  supportsHistorySuggestions: boolean
}

export type VendorOrderCadence = {
  orderDays: string[]
  availableDeliveryDays: string[]
  preferredDeliveryDays: string[]
  orderMinimum: string
  orderCutOffTime: string
}

export type VendorOrderPlacement = {
  method: OrderPlacementMethod
  destination: string
}

export type VendorProfile = {
  displayName: string
  category: string
  contactValue: string
}

export type VendorSettingsProfile = {
  profile: VendorProfile
  orderCadence: VendorOrderCadence
  orderPlacement: VendorOrderPlacement
  capabilities: VendorCapabilities
}

export interface VendorPlatformConfig {
  id: string
  settings: VendorSettingsProfile
  /** Portal card fallback when no sent snapshot exists */
  lastKnownOrderDate: string
}

export function orderTriggerLabelFromSettings(
  settings: VendorSettingsProfile,
): string {
  return `${settings.orderCadence.orderDays.join(' / ')} order`
}

export function deliveryLabelFromSettings(
  settings: VendorSettingsProfile,
): string {
  const first =
    settings.orderCadence.preferredDeliveryDays[0] ??
    settings.orderCadence.availableDeliveryDays[0] ??
    'Delivery'
  return `${first} delivery`
}
