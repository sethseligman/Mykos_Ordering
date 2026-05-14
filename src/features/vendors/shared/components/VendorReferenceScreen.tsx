import { useCallback, useEffect, useState } from 'react'
import {
  fetchVendors,
  type SupabaseVendorRow,
} from '../vendorQueries'
import { formatSelectedDays } from '../vendorSettingsDisplay'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

type Props = {
  onBack: () => void
}

function placementLabel(
  method: SupabaseVendorRow['order_placement_method'],
): string {
  switch (method) {
    case 'sms':
      return 'SMS'
    case 'email':
      return 'Email'
    case 'portal':
      return 'Portal'
    case 'other':
      return 'Other'
  }
}

function yesNo(v: boolean): string {
  return v ? 'Yes' : 'No'
}

export function VendorReferenceScreen({ onBack }: Props) {
  const [vendors, setVendors] = useState<SupabaseVendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchVendors(RESTAURANT_ID)
      const sorted = [...rows].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
      setVendors(sorted)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load vendor reference.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="min-h-dvh bg-[#e8e4dc] px-3 py-5 font-sans text-stone-800 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to portal
        </button>

        <header className="mt-4 rounded-lg border border-stone-300 bg-[#f7f5f0] px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Reference
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Master vendor list
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Ordering cadence, cutoffs, and how each vendor is reached. Same data
            as vendor admin, read-only for the line.
          </p>
        </header>

        <section className="mt-6">
          {loading ? (
            <p className="text-center text-sm text-stone-600">
              Loading vendors…
            </p>
          ) : error ? (
            <div className="flex flex-col gap-3">
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="self-start rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                Retry
              </button>
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-center text-sm text-stone-600">
              No active vendors.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {vendors.map((v) => (
                <li
                  key={v.id}
                  className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-stone-900 break-words">
                    {v.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-stone-500 break-words">
                    {v.category}
                  </p>

                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-stone-700">Rep / contact</dt>
                      <dd className="text-stone-600 break-words">{v.rep_name}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">How to order</dt>
                      <dd className="text-stone-600 break-words">
                        {placementLabel(v.order_placement_method)}
                        {' · '}
                        {v.destination}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">Order days</dt>
                      <dd className="text-stone-600">
                        {v.order_days.length > 0
                          ? formatSelectedDays(v.order_days)
                          : 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">Cutoff</dt>
                      <dd className="text-stone-600">{v.order_cutoff_time}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">
                        Preferred delivery
                      </dt>
                      <dd className="text-stone-600">
                        {v.preferred_delivery_days.length > 0
                          ? formatSelectedDays(v.preferred_delivery_days)
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">
                        Available delivery
                      </dt>
                      <dd className="text-stone-600">
                        {v.available_delivery_days.length > 0
                          ? formatSelectedDays(v.available_delivery_days)
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-stone-700">Order minimum</dt>
                      <dd className="text-stone-600">
                        {Number.isFinite(v.order_minimum)
                          ? `$${Number(v.order_minimum).toFixed(2)}`
                          : '—'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-stone-700">Capabilities</dt>
                      <dd className="text-stone-600">
                        Add-ons: {yesNo(v.supports_addons)} · Standing orders:{' '}
                        {yesNo(v.supports_standing_orders)} · History suggestions:{' '}
                        {yesNo(v.supports_history_suggestions)}
                      </dd>
                    </div>
                    {v.ordering_notes ? (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-stone-700">Notes</dt>
                        <dd className="whitespace-pre-wrap text-stone-600 break-words">
                          {v.ordering_notes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
