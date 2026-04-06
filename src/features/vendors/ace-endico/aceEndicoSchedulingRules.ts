import { resolveVendorPlatformConfig } from '../shared/vendorSettingsStorage'
import type { VendorSchedulingRules, Weekday } from '../shared/vendorScheduling/types'
import { aceEndicoPlatformConfig } from './aceEndicoVendorConfig'

const WEEKDAY_MAP: Record<string, Weekday> = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
}

export const aceEndicoSchedulingRules: VendorSchedulingRules = {
  vendorId: 'ace-endico',
  vendorDisplayName: 'Ace / Endico',
  vendorDeliveryDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  preferredDeliveryDays: ['wednesday'],
  validOrderDays: ['monday'],
  invalidDateStrategy: 'suggest_next_valid_date',
}

export function aceEndicoSchedulingRulesFromSettings(): VendorSchedulingRules {
  const resolved = resolveVendorPlatformConfig(aceEndicoPlatformConfig)
  const preferredDeliveryDaysFromSettings =
    resolved.settings.orderCadence.availableDeliveryDays
      .map((d) => WEEKDAY_MAP[d.trim().toLowerCase()])
      .filter(Boolean)
  const validOrderDays = resolved.settings.orderCadence.orderDays
    .map((d) => WEEKDAY_MAP[d.trim().toLowerCase()])
    .filter(Boolean)
  return {
    ...aceEndicoSchedulingRules,
    vendorDeliveryDays: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ],
    preferredDeliveryDays:
      preferredDeliveryDaysFromSettings.length > 0
        ? (preferredDeliveryDaysFromSettings as Weekday[])
        : aceEndicoSchedulingRules.preferredDeliveryDays,
    validOrderDays:
      validOrderDays.length > 0
        ? (validOrderDays as Weekday[])
        : aceEndicoSchedulingRules.validOrderDays,
  }
}
