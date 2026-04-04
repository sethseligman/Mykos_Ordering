import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib'
import { type SupabaseVendorRow } from '../shared/vendorQueries'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

type Props = {
  onBack: () => void
  onAddVendor: () => void
  onEditVendor?: (vendorId: string) => void
}

function placementDisplay(
  method: SupabaseVendorRow['order_placement_method'],
): string {
  switch (method) {
    case 'sms':
      return 'SMS'
    case 'email':
      return 'Email'
    case 'portal':
      return 'Portal'
  }
}

export function VendorAdminScreen({
  onBack,
  onAddVendor,
  onEditVendor,
}: Props) {
  const [vendors, setVendors] = useState<SupabaseVendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] =
    useState<SupabaseVendorRow | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const loadVendors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('vendors')
        .select('*')
        .eq('restaurant_id', RESTAURANT_ID)
        .is('archived_at', null)

      if (fetchError) {
        throw new Error(
          `Failed to fetch vendors for restaurant ${RESTAURANT_ID}: ${fetchError.message}`,
        )
      }
      setVendors((data ?? []) as SupabaseVendorRow[])
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load vendors.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVendors()
  }, [loadVendors])

  const closeArchiveModal = () => {
    if (archiving) return
    setArchiveTarget(null)
    setArchiveError(null)
  }

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    setArchiveError(null)
    const { error: updateError } = await supabase
      .from('vendors')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', archiveTarget.id)
    setArchiving(false)
    if (updateError) {
      setArchiveError(updateError.message)
      return
    }
    setVendors((prev) => prev.filter((v) => v.id !== archiveTarget.id))
    setArchiveTarget(null)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#e8e4dc] font-sans text-stone-800">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-3 py-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to portal
        </button>
        <h1 className="mt-4 text-xl font-semibold text-stone-900">
          Vendor admin
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Manage vendors for your restaurant. Add, edit, or archive vendor
          profiles.
        </p>

        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          {loading ? (
            <p className="flex flex-1 items-center justify-center text-center text-sm text-stone-600">
              Loading vendors…
            </p>
          ) : error ? (
            <div className="flex flex-1 flex-col gap-3">
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
              <button
                type="button"
                onClick={() => void loadVendors()}
                className="self-start rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                Retry
              </button>
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-stone-600">No vendors yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {vendors.map((vendor) => (
                <li
                  key={vendor.id}
                  className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-lg font-semibold leading-snug text-stone-900 break-words">
                    {vendor.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500 break-words">
                    {vendor.category}
                  </p>
                  <p className="mt-2 text-sm text-stone-700 break-words">
                    {vendor.order_days.join(' / ')}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 break-words">
                    {placementDisplay(vendor.order_placement_method)}
                    {' · '}
                    {vendor.destination}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {onEditVendor ? (
                      <button
                        type="button"
                        onClick={() => onEditVendor(vendor.id)}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveError(null)
                        setArchiveTarget(vendor)
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Archive
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sticky bottom-0 mt-6 bg-[#e8e4dc] pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onAddVendor}
            className="w-full rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 shadow-sm hover:bg-stone-800"
          >
            Add vendor
          </button>
        </div>
      </div>

      {archiveTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-vendor-title"
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h2
              id="archive-vendor-title"
              className="text-lg font-semibold text-stone-900"
            >
              Archive {archiveTarget.name}?
            </h2>
            <p className="text-sm leading-relaxed text-stone-600">
              This vendor will be hidden from your portal. Your order history
              will be preserved and the vendor can be restored later.
            </p>
            {archiveError ? (
              <p className="text-xs text-red-600">{archiveError}</p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={archiving}
                onClick={closeArchiveModal}
                className="flex-1 rounded-md border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={archiving}
                onClick={() => void handleConfirmArchive()}
                className="flex-1 rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
