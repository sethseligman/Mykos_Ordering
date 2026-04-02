const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const WEEKDAY_SET = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
const WEEKDAY_PLUS_SATURDAY_SET = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
])

export function formatSelectedDays(days: string[]): string {
  const unique = WEEK_DAYS.filter((d) => days.includes(d))
  const selectedSet = new Set<string>(unique)
  if (unique.length === 0) return 'None'
  const hasMonToSat =
    [...WEEKDAY_PLUS_SATURDAY_SET].every((d) => selectedSet.has(d)) &&
    unique.length === 6
  if (hasMonToSat) return 'Monday - Saturday'
  const hasAllWeekdays = [...WEEKDAY_SET].every((d) => selectedSet.has(d)) && unique.length === 5
  if (hasAllWeekdays) return 'Monday - Friday'
  return unique.join(', ')
}

