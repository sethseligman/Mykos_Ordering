import type {
  VendorDeliveryDateValidation,
  VendorSchedulingRules,
  Weekday,
} from './types'
import {
  formatWeekdayListForMessage,
  weekdayFromIsoDate,
} from './weekdayUtils'

function findNextValidDeliveryDateIso(
  fromIso: string,
  rules: VendorSchedulingRules,
  maxScanDays = 28,
): string | null {
  const raw = fromIso.trim()
  if (!raw) return null
  const start = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(start.getTime())) return null

  const allowed = new Set<Weekday>(rules.validDeliveryDays)
  for (let i = 0; i <= maxScanDays; i++) {
    const t = new Date(start)
    t.setDate(start.getDate() + i)
    const dow = t.getDay()
    const map: Weekday[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    const w = map[dow]
    if (allowed.has(w)) return t.toISOString().slice(0, 10)
  }
  return null
}

/**
 * First delivery day in `rules.validDeliveryDays` on or after local “today” (ISO date).
 */
export function defaultDeliveryDateForScheduling(
  rules: VendorSchedulingRules,
  todayIso = new Date().toISOString().slice(0, 10),
): string {
  return findNextValidDeliveryDateIso(todayIso, rules) ?? todayIso
}

export function validateVendorDeliveryDate(
  rules: VendorSchedulingRules,
  deliveryDateIso: string,
): VendorDeliveryDateValidation {
  const weekday = weekdayFromIsoDate(deliveryDateIso)
  if (!weekday) {
    return {
      isValid: false,
      weekday: null,
      suggestedNextValidDate: null,
      applyStandingOrders: false,
      applyHistorySuggestions: false,
      message: 'Choose a delivery date.',
      blocksPrimaryActions: rules.invalidDateStrategy === 'block_order',
    }
  }

  const isValid = rules.validDeliveryDays.includes(weekday)
  const standingLines = rules.standingOrderRules?.[weekday]
  const applyStandingOrders =
    isValid && !!standingLines && standingLines.length > 0
  const applyHistorySuggestions = isValid

  let suggestedNextValidDate: string | null = null
  if (
    !isValid &&
    rules.invalidDateStrategy === 'suggest_next_valid_date'
  ) {
    suggestedNextValidDate = findNextValidDeliveryDateIso(
      deliveryDateIso,
      rules,
    )
  }

  let message: string | undefined
  if (!isValid) {
    const deliveryLabel = formatWeekdayListForMessage(
      rules.validDeliveryDays,
    )
    message = `${rules.vendorDisplayName} only delivers on ${deliveryLabel}.`
    if (rules.validOrderDays?.length) {
      message += ` Typical order days: ${formatWeekdayListForMessage(rules.validOrderDays)}.`
    }
  }

  const blocksPrimaryActions =
    !isValid && rules.invalidDateStrategy === 'block_order'

  return {
    isValid,
    weekday,
    suggestedNextValidDate,
    applyStandingOrders,
    applyHistorySuggestions,
    message,
    blocksPrimaryActions,
  }
}
