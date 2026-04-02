import type { Weekday } from './types'

const JS_TO_WEEKDAY: Record<number, Weekday> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export function weekdayFromIsoDate(iso: string): Weekday | null {
  const raw = iso.trim()
  if (!raw) return null
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return JS_TO_WEEKDAY[d.getDay()] ?? null
}

const WEEKDAY_LABEL: Record<Weekday, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
}

/** e.g. "Tuesday and Friday" */
export function formatWeekdayListForMessage(days: Weekday[]): string {
  const uniq = [...new Set(days)]
  const labels = uniq.map((d) => WEEKDAY_LABEL[d])
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export function formatShortDeliveryDate(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
