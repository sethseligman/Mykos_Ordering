type Props = {
  onBack: () => void
  onAddVendor: () => void
}

/**
 * Scaffold for future vendor management (list, edit, disable).
 * No persistence or CRUD yet.
 */
export function VendorAdminScreen({ onBack, onAddVendor }: Props) {
  return (
    <div className="min-h-dvh bg-[#e8e4dc] px-3 py-6 font-sans text-stone-800 sm:px-6">
      <div className="mx-auto max-w-lg">
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
          Central place for onboarding and vendor configuration. Vendor list and
          edits will connect here; for now this is a navigation shell only.
        </p>
        <div className="mt-6 rounded-lg border border-dashed border-stone-400 bg-[#f7f5f0]/80 px-4 py-8 text-center text-sm text-stone-500">
          Vendor registry UI coming soon
        </div>
        <button
          type="button"
          onClick={onAddVendor}
          className="mt-6 w-full rounded-md border border-stone-800 bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 shadow-sm hover:bg-stone-800"
        >
          Add vendor
        </button>
      </div>
    </div>
  )
}
