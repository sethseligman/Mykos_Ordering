import type { OrderStatus } from '../../../types/order'
import type { VendorDashboardStatus } from '../../../types/portal'
import { readLastSentOrderSnapshot } from '../../../lib/lastSentOrderStorage'
import {
  formatExecutionEventDisplay,
  readMostRecentVendorExecutionEvent,
} from './vendorData/orderExecutionLog'

export function readVendorDraftStatus(vendorId: string): OrderStatus {
  try {
    const raw = localStorage.getItem(`ordering-app:draft:${vendorId}`)
    if (!raw) return 'draft'
    const parsed = JSON.parse(raw) as { status?: unknown }
    if (
      parsed.status === 'draft' ||
      parsed.status === 'ready' ||
      parsed.status === 'sent'
    ) {
      return parsed.status
    }
    return 'draft'
  } catch {
    return 'draft'
  }
}

export function mapOrderStatusToDashboard(status: OrderStatus): VendorDashboardStatus {
  if (status === 'sent') return 'sent'
  if (status === 'ready') return 'draft_ready'
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
  hasSuggestedOrder: boolean,
  snapshotLastMonthDay: string | null,
  lastKnownOrderDateIso: string,
): string {
  if (dashboardStatus === 'sent') {
    const when =
      snapshotLastMonthDay ?? formatIsoDateMonthDay(lastKnownOrderDateIso)
    return `Last sent ${when}`
  }
  if (dashboardStatus === 'draft_ready') {
    return 'Suggested order ready'
  }
  if (hasSuggestedOrder) {
    return 'Suggested order ready'
  }
  return 'Draft not started'
}

/** Portal CTA: workspace entry, not “review” of an editable sheet. */
export function buildPortalVendorCta(
  _vendorId: string,
  orderStatus: OrderStatus,
  placementMethod?: string,
): string {
  if (orderStatus === 'sent') return 'Open workspace'
  if (
    orderStatus === 'ready' &&
    (placementMethod === 'portal' || placementMethod === 'other')
  )
    return 'Ready to place — open workspace'
  if (orderStatus === 'draft') return 'Continue draft'
  return 'Open workspace'
}
