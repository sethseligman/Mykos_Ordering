import type { OrderStatus } from '../../../types/order'
import type { VendorDashboardStatus } from '../../../types/portal'
import { readLastSentOrderSnapshot } from '../../../lib/lastSentOrderStorage'
import {
  formatExecutionEventDisplay,
  readMostRecentVendorExecutionEvent,
} from './vendorData/orderExecutionLog'

export function readVendorDraftStatus(vendorId: string): OrderStatus | 'no_draft' {
  try {
    const raw = localStorage.getItem(`ordering-app:draft:${vendorId}`)
    if (!raw) return 'no_draft'
    const parsed = JSON.parse(raw) as {
      status?: unknown
      items?: unknown
    }
    if (parsed.status === 'sent') return 'sent'
    if (parsed.status === 'ready') return 'ready'
    if (Array.isArray(parsed.items)) {
      const hasItems = parsed.items.some(
        (i: unknown) =>
          i &&
          typeof i === 'object' &&
          (i as Record<string, unknown>).included === true,
      )
      if (hasItems) return 'draft'
    }
    return 'no_draft'
  } catch {
    return 'no_draft'
  }
}

export function mapOrderStatusToDashboard(
  status: OrderStatus | 'no_draft',
): VendorDashboardStatus {
  if (status === 'sent') return 'sent'
  if (status === 'ready') return 'draft_ready'
  if (status === 'draft') return 'draft'
  return 'not_started'
}

/** e.g. "Mar 27" for card copy */
export function formatIsoDateMonthDay(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatSnapshotSentMonthDay(sentAt: number): string {
  return new Date(sentAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function readVendorLastOrderDisplay(vendorId: string): string | null {
  const snap = readLastSentOrderSnapshot(vendorId)
  if (!snap) return null
  return formatSnapshotSentMonthDay(snap.sentAt)
}

export function readVendorLastExecutionDisplay(vendorId: string): string | null {
  const event = readMostRecentVendorExecutionEvent(vendorId)
  if (!event) return null
  return formatExecutionEventDisplay(event)
}

export function buildVendorStatusDetailLine(
  dashboardStatus: VendorDashboardStatus,
  snapshotLastMonthDay: string | null,
  lastKnownOrderDateIso: string,
): string {
  if (dashboardStatus === 'sent') {
    const when =
      snapshotLastMonthDay ?? formatIsoDateMonthDay(lastKnownOrderDateIso)
    return `Last sent ${when}`
  }
  if (dashboardStatus === 'draft_ready') {
    return 'Ready to place'
  }
  if (dashboardStatus === 'draft') {
    return 'Draft in progress'
  }
  return ''
}

export function readVendorDraftTimestamp(vendorId: string): string | null {
  try {
    const raw = localStorage.getItem(`ordering-app:draft-ts:${vendorId}`)
    if (!raw) return null
    const ts = parseInt(raw, 10)
    if (Number.isNaN(ts)) return null
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

/** Portal CTA: workspace entry, not “review” of an editable sheet. */
export function buildPortalVendorCta(
  _vendorId: string,
  orderStatus: OrderStatus | 'no_draft',
  placementMethod?: string,
): string {
  if (orderStatus === 'sent') return 'Open workspace'
  if (
    orderStatus === 'ready' &&
    (placementMethod === 'portal' || placementMethod === 'other')
  )
    return 'Ready to place — open workspace'
  if (orderStatus === 'ready') return 'Review & send'
  if (orderStatus === 'draft') return 'Continue draft'
  return 'Start order'
}
