import { useCallback, useEffect, useState } from 'react'
import {
  deleteFinalizedOrder,
  getFinalizedOrdersByVendor,
} from '../shared/finalizedOrderQueries'

type Props = {
  vendorId: string
  vendorName: string
  onBack: () => void
}

type HistoryOrder = Awaited<
  ReturnType<typeof getFinalizedOrdersByVendor>
>[number]

function formatDeliveryDate(deliveryDate: string): string {
  return new Date(`${deliveryDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSentAt(sentAt: string): string {
  const d = new Date(sentAt)
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const timePart = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} at ${timePart}`
}

function channelDisplay(channel: string): string {
  switch (channel.toLowerCase()) {
    case 'sms':
      return 'SMS'
    case 'email':
      return 'Email'
    case 'portal':
      return 'Portal'
    default:
      return 'Other'
  }
}

function countIncludedItems(items: unknown): number {
  const draft = items as { items?: unknown } | null | undefined
  const arr = draft?.items
  if (!Array.isArray(arr)) return 0
  return arr.filter(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      'included' in e &&
      (e as { included?: boolean }).included === true,
  ).length
}

function itemCountLabel(items: unknown): string {
  const n = countIncludedItems(items)
  return n === 1 ? '1 item' : `${n} items`
}

export function OrderHistoryScreen({
  vendorId,
  vendorName,
  onBack,
}: Props) {
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HistoryOrder | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getFinalizedOrdersByVendor(vendorId)
      setOrders(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order history.')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFinalizedOrder(
        deleteTarget.id,
        vendorId,
        deleteTarget.sent_at,
      )
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : 'Failed to delete order.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#e8e4dc] font-sans text-stone-800">
      <div className="mx-auto w-full max-w-lg flex-1 px-3 py-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to admin
        </button>
        <h1 className="mt-4 text-xl font-semibold text-stone-900">
          {vendorName} — Order History
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {loading
            ? 'Loading…'
            : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
        </p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-stone-600">Loading order history…</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="mt-2 block text-xs font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-stone-600">
              No order history for this vendor.
            </p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-stone-900">
                  Delivery: {formatDeliveryDate(order.delivery_date)}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Sent: {formatSentAt(order.sent_at)}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Channel: {channelDisplay(order.channel)}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {itemCountLabel(order.items)}
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(order)
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-order-title"
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2
              id="delete-order-title"
              className="text-lg font-semibold text-stone-900"
            >
              Delete this order?
            </h2>
            <p className="text-sm leading-relaxed text-stone-600">
              Delivery {formatDeliveryDate(deleteTarget.delivery_date)} — sent{' '}
              {formatSentAt(deleteTarget.sent_at)}. This removes the finalized
              order and matching execution log entry. This cannot be undone.
            </p>
            {deleteError ? (
              <p className="text-xs text-red-600">{deleteError}</p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={closeDeleteModal}
                className="flex-1 rounded-md border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="flex-1 rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
