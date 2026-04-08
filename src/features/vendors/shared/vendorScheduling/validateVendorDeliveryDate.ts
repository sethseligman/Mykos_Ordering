import type {
  VendorDeliveryDateValidation,
  VendorSchedulingRules,
  Weekday,
} from './types'
import {
  formatShortDeliveryDate,
  formatWeekdayListForMessage,
  weekdayFromIsoDate,
} from './weekdayUtils'

function parseCutoffTime(
  cutoffStr: string,
): { hours: number; minutes: number } | null {
  const trimmed = cutoffStr.trim().toUpperCase()

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2], 10)
    const period = match12[3]
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return { hours, minutes }
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return {
      hours: parseInt(match24[1], 10),
      minutes: parseInt(match24[2], 10),
    }
  }

  return null
}

function isDeliveryStillOrderable(
  deliveryDateIso: string,
  cutoffTime: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!cutoffTime) return true

  const parsed = parseCutoffTime(cutoffTime)
  if (!parsed) return true

  const delivery = new Date(`${deliveryDateIso}T12:00:00`)
  if (Number.isNaN(delivery.getTime())) return true

  const orderDeadline = new Date(delivery)
  orderDeadline.setDate(delivery.getDate() - 1)
  orderDeadline.setHours(parsed.hours, parsed.minutes, 0, 0)

  return now < orderDeadline
}

function findNextValidDeliveryDateIso(
  fromIso: string,
  rules: VendorSchedulingRules,
  maxScanDays = 28,
  now: Date = new Date(),
): string | null {
  const raw = fromIso.trim()
  if (!raw) return null
  const start = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(start.getTime())) return null

  const allowed = new Set<Weekday>(rules.preferredDeliveryDays)
  const map: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]

  for (let i = 0; i <= maxScanDays; i++) {
    const t = new Date(start)
    t.setDate(start.getDate() + i)
    const w = map[t.getDay()]
    if (!allowed.has(w)) continue

    const iso = t.toISOString().slice(0, 10)

    if (!isDeliveryStillOrderable(iso, rules.cutoffTime, now)) {
      continue
    }

    return iso
  }
  return null
}

/**
 * First delivery day in `rules.preferredDeliveryDays` on or after local “today” (ISO date).
 */
export function defaultDeliveryDateForScheduling(
  rules: VendorSchedulingRules,
  todayIso = new Date().toISOString().slice(0, 10),
  now: Date = new Date(),
): string {
  return findNextValidDeliveryDateIso(todayIso, rules, 28, now) ?? todayIso
}

export function validateVendorDeliveryDate(
  rules: VendorSchedulingRules,
  deliveryDateIso: string,
  now: Date = new Date(),
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

  const isCorrectDay = rules.preferredDeliveryDays.includes(weekday)
  const isOrderable = isDeliveryStillOrderable(
    deliveryDateIso,
    rules.cutoffTime,
    now,
  )
  const isValid = isCorrectDay && isOrderable

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
      28,
      now,
    )
  }

  let message: string | undefined
  if (!isCorrectDay) {
    const deliveryLabel = formatWeekdayListForMessage(
      rules.preferredDeliveryDays,
    )
    message = `${rules.vendorDisplayName} only delivers on ${deliveryLabel}.`
  } else if (!isOrderable) {
    const cutoffStr = rules.cutoffTime ?? '5:00 PM'
    message = `Order cutoff for this delivery has passed (${cutoffStr} the day before).`
    if (suggestedNextValidDate) {
      const nextLabel = formatShortDeliveryDate(suggestedNextValidDate)
      message += ` Next available: ${nextLabel}.`
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
