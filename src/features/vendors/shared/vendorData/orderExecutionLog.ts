import type { OrderPlacementMethod } from '../vendorConfig'

export type OrderExecutionEvent = {
  vendorId: string
  placedAt: number
  deliveryDate: string
  method: OrderPlacementMethod
  lineCount: number
}

const MAX_EVENTS = 30

function keyForVendorExecutionEvents(vendorId: string): string {
  return `ordering-app:executionEvents:${vendorId}`
}

export function readVendorExecutionEvents(vendorId: string): OrderExecutionEvent[] {
  try {
    const raw = localStorage.getItem(keyForVendorExecutionEvents(vendorId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e): e is OrderExecutionEvent => {
      if (!e || typeof e !== 'object') return false
      const r = e as Record<string, unknown>
      return (
        typeof r.vendorId === 'string' &&
        typeof r.placedAt === 'number' &&
        typeof r.deliveryDate === 'string' &&
        typeof r.method === 'string' &&
        typeof r.lineCount === 'number'
      )
    })
  } catch {
    return []
  }
}

export function appendVendorExecutionEvent(event: OrderExecutionEvent): void {
  const next = [event, ...readVendorExecutionEvents(event.vendorId)]
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, MAX_EVENTS)
  localStorage.setItem(keyForVendorExecutionEvents(event.vendorId), JSON.stringify(next))
}

export function readMostRecentVendorExecutionEvent(
  vendorId: string,
): OrderExecutionEvent | null {
  const events = readVendorExecutionEvents(vendorId)
  if (events.length === 0) return null
  return [...events].sort((a, b) => b.placedAt - a.placedAt)[0]
}

export function formatExecutionEventDisplay(event: OrderExecutionEvent): string {
  const when = new Date(event.placedAt).toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Last placed: ${when} via ${event.method.toUpperCase()}`
}

