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
  validDeliveryDays: ['wednesday'],
  validOrderDays: ['monday'],
  invalidDateStrategy: 'suggest_next_valid_date',
}

export function aceEndicoSchedulingRulesFromSettings(): VendorSchedulingRules {
  const resolved = resolveVendorPlatformConfig(aceEndicoPlatformConfig)
  const validDeliveryDays = resolved.settings.orderCadence.availableDeliveryDays
    .map((d) => WEEKDAY_MAP[d.trim().toLowerCase()])
    .filter(Boolean)
  const validOrderDays = resolved.settings.orderCadence.orderDays
    .map((d) => WEEKDAY_MAP[d.trim().toLowerCase()])
    .filter(Boolean)
  return {
    ...aceEndicoSchedulingRules,
    validDeliveryDays:
      validDeliveryDays.length > 0
        ? (validDeliveryDays as Weekday[])
        : aceEndicoSchedulingRules.validDeliveryDays,
    validOrderDays:
      validOrderDays.length > 0
        ? (validOrderDays as Weekday[])
        : aceEndicoSchedulingRules.validOrderDays,
  }
}
