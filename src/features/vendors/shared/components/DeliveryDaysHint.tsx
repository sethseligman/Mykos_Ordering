import { useState } from 'react'
import type { Weekday } from '../vendorScheduling/types'

const WEEK_ORDER: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

function weekdayShort(w: Weekday): string {
  return w.charAt(0).toUpperCase() + w.slice(1, 3)
}

function sortWeekdaysUnique(days: Weekday[]): Weekday[] {
  const uniq = [...new Set(days)]
  return uniq.sort(
    (a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b),
  )
}

function nextCalendarDay(w: Weekday): Weekday {
  const i = WEEK_ORDER.indexOf(w)
  return WEEK_ORDER[(i + 1) % 7]
}

/** e.g. Tue · Fri */
function formatWeekdaysShortLine(days: Weekday[]): string {
  if (days.length === 0) return '—'
  return sortWeekdaysUnique(days).map(weekdayShort).join(' · ')
}

function formatRun(start: Weekday, end: Weekday): string {
  if (start === end) return weekdayShort(start)
  return `${weekdayShort(start)} – ${weekdayShort(end)}`
}

/** Long format: ranges with en dash when consecutive, · otherwise */
function formatWeekdaysLongLine(days: Weekday[]): string {
  const sorted = sortWeekdaysUnique(days)
  if (sorted.length === 0) return '—'
  const parts: string[] = []
  let runStart = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]
    if (nextCalendarDay(prev) === cur) {
      prev = cur
      continue
    }
    parts.push(formatRun(runStart, prev))
    runStart = cur
    prev = cur
  }
  parts.push(formatRun(runStart, prev))
  return parts.join(' · ')
}

function formatCurrency(n: number): string {
  if (Number.isInteger(n)) return `$${n}`
  return `$${n.toFixed(2)}`
}

type Props = {
  preferredDeliveryDays: Weekday[]
  vendorDeliveryDays: Weekday[]
  orderMinimum?: number | null
  cutoffTime?: string | null
}

export function DeliveryDaysHint({
  preferredDeliveryDays,
  vendorDeliveryDays,
  orderMinimum,
  cutoffTime,
}: Props) {
  const [open, setOpen] = useState(false)
  const shortLine = formatWeekdaysShortLine(preferredDeliveryDays)

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        <span>Delivery days: {shortLine}</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-[10px] font-semibold text-stone-600 hover:bg-stone-100"
          aria-expanded={open}
          aria-label="Delivery schedule details"
        >
          ⓘ
        </button>
      </div>
      {open ? (
        <div
          className="mt-2 space-y-1 rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 shadow-sm"
          role="region"
          aria-label="Delivery details"
        >
          <p>
            • Delivery days: {formatWeekdaysLongLine(vendorDeliveryDays)}
          </p>
          <p>
            • Your usual days:{' '}
            {formatWeekdaysLongLine(preferredDeliveryDays)}
          </p>
          {orderMinimum != null && orderMinimum > 0 ? (
            <p>• Order minimum: {formatCurrency(orderMinimum)}</p>
          ) : null}
          {cutoffTime != null && cutoffTime.trim() !== '' ? (
            <p>
              • Order cutoff: {formatCutoffDisplay(cutoffTime.trim())}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function formatCutoffDisplay(raw: string): string {
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw)
  if (!t) return raw
  const h = parseInt(t[1], 10)
  const m = parseInt(t[2], 10)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
