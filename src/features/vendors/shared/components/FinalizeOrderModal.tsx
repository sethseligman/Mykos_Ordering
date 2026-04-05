import { useCallback, useEffect, useState } from 'react'
import type { OrderStatus } from '../../../../types/order'
import type { OrderPlacementMethod } from '../vendorConfig'

function buildSmsUrl(destination: string, body: string): string {
  const separator = destination.includes('?') ? '&' : '?'
  return `sms:${destination}${separator}body=${encodeURIComponent(body)}`
}

function buildMailtoUrl(destination: string, body: string): string {
  return `mailto:${destination}?subject=Order&body=${encodeURIComponent(body)}`
}

type Props = {
  isOpen: boolean
  onClose: () => void
  vendorName: string
  deliveryDate: string
  itemCount: number
  previewText: string
  placementMethod: OrderPlacementMethod
  destination: string
  onMarkSent: () => void
  status: OrderStatus
  /** Optional hook before opening sms:/mailto: (e.g. execution log on custom sheets) */
  onNativeSendWillOpen?: () => void
  disableActions?: boolean
}

export function FinalizeOrderModal({
  isOpen,
  onClose,
  vendorName,
  deliveryDate,
  itemCount,
  previewText,
  placementMethod,
  destination,
  onMarkSent,
  status,
  onNativeSendWillOpen,
  disableActions = false,
}: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) setCopied(false)
  }, [isOpen])

  const handleCopyInModal = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [previewText])

  const handleSendSms = () => {
    onNativeSendWillOpen?.()
    const url = buildSmsUrl(destination, previewText)
    window.open(url, '_self')
    onMarkSent()
    onClose()
  }

  const handleSendEmail = () => {
    onNativeSendWillOpen?.()
    const url = buildMailtoUrl(destination, previewText)
    window.open(url, '_self')
    onMarkSent()
    onClose()
  }

  const handleMarkOnly = () => {
    onMarkSent()
    onClose()
  }

  if (!isOpen) return null

  const blocked = disableActions || status === 'sent'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-order-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative z-[101] max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[#f7f5f0] px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative pr-10">
          <h2
            id="finalize-order-title"
            className="text-lg font-bold text-stone-900"
          >
            {vendorName}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Delivery {deliveryDate || '—'} · {itemCount} item
            {itemCount === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 text-2xl leading-none text-stone-400 hover:text-stone-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
            Order text
          </label>
          <textarea
            readOnly
            rows={6}
            value={previewText}
            className="mt-1 w-full resize-none rounded-lg border border-stone-200 bg-white p-3 font-mono text-xs text-stone-800"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {placementMethod === 'sms' ? (
            <>
              <button
                type="button"
                disabled={blocked}
                onClick={handleSendSms}
                className="w-full rounded-lg bg-stone-900 py-3 text-sm font-semibold text-stone-50 disabled:opacity-40"
              >
                Send via SMS
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={handleCopyInModal}
                className="w-full rounded-lg border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-800 disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={handleMarkOnly}
                className="w-full py-2 text-sm text-stone-500 underline-offset-2 hover:underline disabled:opacity-40"
              >
                Mark as sent
              </button>
            </>
          ) : null}

          {placementMethod === 'email' ? (
            <>
              <button
                type="button"
                disabled={blocked}
                onClick={handleSendEmail}
                className="w-full rounded-lg bg-stone-900 py-3 text-sm font-semibold text-stone-50 disabled:opacity-40"
              >
                Send via Email
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={handleCopyInModal}
                className="w-full rounded-lg border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-800 disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={handleMarkOnly}
                className="w-full py-2 text-sm text-stone-500 underline-offset-2 hover:underline disabled:opacity-40"
              >
                Mark as sent
              </button>
            </>
          ) : null}

          {placementMethod === 'portal' || placementMethod === 'other' ? (
            <>
              <button
                type="button"
                disabled={blocked}
                onClick={handleCopyInModal}
                className="w-full rounded-lg bg-stone-900 py-3 text-sm font-semibold text-stone-50 disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={handleMarkOnly}
                className="w-full rounded-lg border border-stone-300 bg-white py-3 text-sm font-semibold text-stone-800 disabled:opacity-40"
              >
                Mark as placed
              </button>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 text-xs text-stone-400"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
