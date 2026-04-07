import { useState } from 'react'
import type { Vendor } from '../../../../types/order'

const channelLabel: Record<Vendor['channel'], string> = {
  text: 'SMS',
  email: 'Email',
  phone: 'Phone',
  portal: 'Portal',
  other: 'Other',
}

type Props = {
  vendor: Vendor
  repName?: string
  preferredDeliveryDays?: string[]
  orderMinimum?: string | number | null
  cutoffTime?: string | null
  orderingNotes?: string | null
}

export function VendorHeader({
  vendor,
  repName,
  preferredDeliveryDays,
  orderMinimum,
  cutoffTime,
  orderingNotes,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <header className="border-b border-stone-300 bg-stone-50/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="min-w-0 truncate font-sans text-xl font-semibold tracking-tight text-stone-900">
            {vendor.name}
          </h1>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="shrink-0 rounded-full p-0.5 text-stone-400 hover:text-stone-600"
            aria-expanded={infoOpen}
            aria-label="Vendor info"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {channelLabel[vendor.channel]}
        </span>
      </div>
      {infoOpen ? (
        <div className="mt-2 space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs shadow-sm">
          {repName ? (
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-semibold text-stone-500">
                Rep
              </span>
              <span className="text-stone-800">{repName}</span>
            </div>
          ) : null}
          {preferredDeliveryDays && preferredDeliveryDays.length > 0 ? (
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-semibold text-stone-500">
                Delivery days
              </span>
              <span className="text-stone-800">
                {preferredDeliveryDays.join(' · ')}
              </span>
            </div>
          ) : null}
          {cutoffTime ? (
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-semibold text-stone-500">
                Order cutoff
              </span>
              <span className="text-stone-800">{cutoffTime}</span>
            </div>
          ) : null}
          {orderMinimum != null &&
          String(orderMinimum).trim() !== '' &&
          String(orderMinimum) !== '0' ? (
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-semibold text-stone-500">
                Order minimum
              </span>
              <span className="text-stone-800">${orderMinimum}</span>
            </div>
          ) : null}
          {orderingNotes ? (
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-semibold text-stone-500">
                Notes
              </span>
              <span className="text-stone-800">{orderingNotes}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
