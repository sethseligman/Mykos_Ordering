type Props = { onBack: () => void }

/**
 * Form field scaffold for future onboarding. Not submitted or persisted.
 */
export function AddVendorScreen({ onBack }: Props) {
  return (
    <div className="min-h-dvh bg-[#e8e4dc] px-3 py-6 font-sans text-stone-800 sm:px-6">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to admin
        </button>
        <h1 className="mt-4 text-xl font-semibold text-stone-900">
          Add vendor
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Fields below mirror the planned vendor profile. Saving is not wired up
          yet.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <Field label="Vendor name" htmlFor="vendor-name" />
          <Field label="Category" htmlFor="vendor-category" />
          <Field
            label="Channel type"
            htmlFor="vendor-channel"
            hint="e.g. SMS, email"
          />
          <Field
            label="Contact info"
            htmlFor="vendor-contact"
            hint="Phone, email, or URL as appropriate"
          />
          <Field
            label="Order cadence"
            htmlFor="vendor-cadence"
            hint="When to order and expected delivery pattern"
          />
          <div>
            <label
              htmlFor="vendor-notes"
              className="text-xs font-semibold uppercase tracking-wide text-stone-600"
            >
              Notes
            </label>
            <textarea
              id="vendor-notes"
              rows={3}
              disabled
              placeholder="Internal notes (optional)"
              className="mt-1.5 w-full rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-600"
            />
          </div>
          <button
            type="submit"
            disabled
            className="w-full rounded-md border border-stone-300 bg-stone-200 py-2.5 text-sm font-semibold text-stone-500"
          >
            Save (not enabled)
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
}: {
  label: string
  htmlFor: string
  hint?: string
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wide text-stone-600"
      >
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-stone-500">{hint}</p>
      ) : null}
      <input
        id={htmlFor}
        type="text"
        disabled
        className="mt-1.5 w-full rounded-md border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-600"
      />
    </div>
  )
}
