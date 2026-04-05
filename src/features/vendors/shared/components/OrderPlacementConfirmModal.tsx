import type { OrderPlacementMethod } from '../vendorConfig'

type Props = {
  isOpen: boolean
  vendorName: string
  deliveryDate: string
  method: OrderPlacementMethod
  destination: string
  previewText: string
  onClose: () => void
  onPrint: () => void
  onConfirmSend: () => void
}

function titleForMethod(method: OrderPlacementMethod): string {
  if (method === 'sms') return 'Confirm and send text'
  if (method === 'email') return 'Confirm and send email'
  if (method === 'portal') return 'Confirm portal placement'
  return 'Confirm placement'
}

export function OrderPlacementConfirmModal({
  isOpen,
  vendorName,
  deliveryDate,
  method,
  destination,
  previewText,
  onClose,
  onPrint,
  onConfirmSend,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-stone-300 bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-stone-900">
          {titleForMethod(method)}
        </h3>
        <p className="mt-1 text-xs text-stone-600">
          {vendorName} · Delivery {deliveryDate || 'not set'} · {method.toUpperCase()}
        </p>

        {method === 'sms' || method === 'email' ? (
          <div className="mt-3 rounded border border-stone-200 bg-stone-50 p-3">
            {method === 'email' ? (
              <p className="mb-2 text-xs text-stone-600">
                To: {destination || '(not set)'}<br />
                Subject: {vendorName} order for {deliveryDate || 'delivery date'}
              </p>
            ) : (
              <p className="mb-2 text-xs text-stone-600">
                To: {destination || '(not set)'}
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-stone-800">
              {previewText}
            </pre>
          </div>
        ) : (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This method is configured as <strong>{method.toUpperCase()}</strong>.
            This phase provides a placeholder confirmation step only.
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onConfirmSend}
            className="rounded-md border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Confirm / Send
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

