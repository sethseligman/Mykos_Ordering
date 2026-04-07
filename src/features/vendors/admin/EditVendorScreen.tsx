import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib'
import type { SupabaseVendorRow } from '../shared/vendorQueries'

type Props = {
  vendorId: string
  onBack: () => void
  onSaved: () => void
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

type PlacementMethod = 'sms' | 'email' | 'portal' | 'other'

function generateTimeOptions(): string[] {
  const out: string[] = []
  for (let hour24 = 6; hour24 <= 23; hour24++) {
    for (const minute of [0, 30] as const) {
      const period = hour24 >= 12 ? 'PM' : 'AM'
      let h12 = hour24 % 12
      if (h12 === 0) h12 = 12
      const mm = minute === 0 ? '00' : '30'
      out.push(`${h12}:${mm} ${period}`)
    }
  }
  return out
}

const ORDER_CUTOFF_TIME_OPTIONS = generateTimeOptions()

type FieldKey =
  | 'name'
  | 'category'
  | 'available_delivery_days'
  | 'preferred_delivery_days'
  | 'order_cutoff_time'
  | 'destination'

export function EditVendorScreen({ vendorId, onBack, onSaved }: Props) {
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [repName, setRepName] = useState('')
  /** Loaded from DB only; not edited in UI — preserved on save. */
  const [orderDays, setOrderDays] = useState<string[]>([])
  const [availableDeliveryDays, setAvailableDeliveryDays] = useState<string[]>(
    [],
  )
  const [preferredDeliveryDays, setPreferredDeliveryDays] = useState<
    string[]
  >([])
  const [orderMinimum, setOrderMinimum] = useState('0')
  const [orderCutoffTime, setOrderCutoffTime] = useState('5:00 PM')
  const [orderingNotes, setOrderingNotes] = useState('')
  const [placementMethod, setPlacementMethod] =
    useState<PlacementMethod>('sms')
  const [destination, setDestination] = useState('')
  const [vendorNotes, setVendorNotes] = useState('')
  const [supportsAddons, setSupportsAddons] = useState(false)
  const [supportsStandingOrders, setSupportsStandingOrders] = useState(false)
  const [supportsHistorySuggestions, setSupportsHistorySuggestions] =
    useState(false)

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadState('loading')
      setLoadError(null)
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single()

      if (cancelled) return

      if (error || !data) {
        setLoadState('error')
        setLoadError(error?.message ?? 'Vendor not found.')
        return
      }

      const row = data as SupabaseVendorRow
      setName(row.name)
      setCategory(row.category)
      setRepName(row.rep_name ?? '')
      setOrderDays([...(row.order_days ?? [])])
      setAvailableDeliveryDays([...row.available_delivery_days])
      setPreferredDeliveryDays([...row.preferred_delivery_days])
      setOrderMinimum(String(row.order_minimum))
      const cutoff = ORDER_CUTOFF_TIME_OPTIONS.includes(row.order_cutoff_time)
        ? row.order_cutoff_time
        : '5:00 PM'
      setOrderCutoffTime(cutoff)
      setPlacementMethod(row.order_placement_method)
      if (
        row.order_placement_method === 'portal' ||
        row.order_placement_method === 'other'
      ) {
        setVendorNotes(row.destination)
        setDestination('')
      } else {
        setDestination(row.destination)
        setVendorNotes('')
      }
      setSupportsAddons(row.supports_addons)
      setSupportsStandingOrders(row.supports_standing_orders)
      setSupportsHistorySuggestions(row.supports_history_suggestions)
      setOrderingNotes(row.ordering_notes ?? '')
      setLoadState('ready')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [vendorId])

  const toggleDay = (
    day: string,
    current: string[],
    setNext: (next: string[]) => void,
  ) => {
    const selected = new Set(current)
    if (selected.has(day)) {
      setNext(current.filter((d) => d !== day))
    } else {
      setNext(DAYS.filter((d) => selected.has(d) || d === day))
    }
  }

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!name.trim()) next.name = 'Vendor name is required.'
    if (!category.trim()) next.category = 'Category is required.'
    if (availableDeliveryDays.length === 0)
      next.available_delivery_days =
        'Select at least one available delivery day.'
    if (preferredDeliveryDays.length === 0)
      next.preferred_delivery_days =
        'Select at least one preferred delivery day.'
    if (!orderCutoffTime.trim())
      next.order_cutoff_time = 'Order cutoff time is required.'
    if (
      (placementMethod === 'sms' || placementMethod === 'email') &&
      !destination.trim()
    )
      next.destination = 'Destination is required.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    const minParsed = parseFloat(orderMinimum.trim())
    const orderMinimumNum =
      orderMinimum.trim() === '' || Number.isNaN(minParsed) ? 0 : minParsed

    setSaving(true)
    const { error } = await supabase
      .from('vendors')
      .update({
        name: name.trim(),
        category: category.trim(),
        rep_name: repName.trim(),
        order_days: orderDays,
        ordering_notes: orderingNotes.trim() || null,
        available_delivery_days: availableDeliveryDays,
        preferred_delivery_days: preferredDeliveryDays,
        order_minimum: orderMinimumNum,
        order_cutoff_time: orderCutoffTime.trim(),
        order_placement_method: placementMethod,
        destination:
          placementMethod === 'portal' || placementMethod === 'other'
            ? vendorNotes.trim()
            : destination.trim(),
        supports_addons: supportsAddons,
        supports_standing_orders: supportsStandingOrders,
        supports_history_suggestions: supportsHistorySuggestions,
      })
      .eq('id', vendorId)
    setSaving(false)

    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  if (loadState === 'loading') {
    return (
      <div className="min-h-dvh bg-[#e8e4dc] px-3 py-6 font-sans text-stone-800 sm:px-6">
        <div className="mx-auto flex max-w-lg min-h-[50vh] items-center justify-center">
          <p className="text-sm text-stone-600">Loading…</p>
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-dvh bg-[#e8e4dc] px-3 py-6 font-sans text-stone-800 sm:px-6">
        <div className="mx-auto max-w-lg space-y-4">
          <p className="text-sm text-red-800">{loadError}</p>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

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
          Edit vendor
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Update this vendor&apos;s profile and save changes to your restaurant.
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Fields marked <span className="text-red-500">*</span> are required.
        </p>

        <form className="mt-6 space-y-8" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Basic info
            </h2>
            <div>
              <label
                htmlFor="vendor-name"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Vendor name
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="vendor-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearFieldError('name')
                }}
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
              {fieldErrors.name ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="vendor-category"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Category
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="vendor-category"
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  clearFieldError('category')
                }}
                placeholder="e.g. Meat, Dry Goods & Dairy"
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
              {fieldErrors.category ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.category}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="vendor-rep"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Rep name
                <span className="ml-1 text-xs font-normal text-stone-400">
                  (optional)
                </span>
              </label>
              <input
                id="vendor-rep"
                type="text"
                value={repName}
                onChange={(e) => {
                  setRepName(e.target.value)
                }}
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Order settings
            </h2>
            <DayPillGroup
              label="Available delivery days"
              required
              selected={availableDeliveryDays}
              onToggle={(day) => {
                toggleDay(day, availableDeliveryDays, setAvailableDeliveryDays)
                clearFieldError('available_delivery_days')
              }}
            />
            {fieldErrors.available_delivery_days ? (
              <p className="text-xs text-red-600">
                {fieldErrors.available_delivery_days}
              </p>
            ) : null}

            <DayPillGroup
              label="Preferred delivery days"
              required
              selected={preferredDeliveryDays}
              onToggle={(day) => {
                toggleDay(day, preferredDeliveryDays, setPreferredDeliveryDays)
                clearFieldError('preferred_delivery_days')
              }}
            />
            {fieldErrors.preferred_delivery_days ? (
              <p className="text-xs text-red-600">
                {fieldErrors.preferred_delivery_days}
              </p>
            ) : null}

            <div>
              <label
                htmlFor="order-minimum"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Order minimum (optional)
              </label>
              <input
                id="order-minimum"
                type="number"
                min={0}
                step="any"
                value={orderMinimum}
                onChange={(e) => setOrderMinimum(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
            </div>
            <div>
              <label
                htmlFor="order-cutoff"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Order cutoff time
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="order-cutoff"
                value={orderCutoffTime}
                onChange={(e) => {
                  setOrderCutoffTime(e.target.value)
                  clearFieldError('order_cutoff_time')
                }}
                className="mt-1.5 w-full min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              >
                {ORDER_CUTOFF_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {fieldErrors.order_cutoff_time ? (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.order_cutoff_time}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="ordering-notes"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Ordering notes (optional)
              </label>
              <textarea
                id="ordering-notes"
                value={orderingNotes}
                onChange={(e) => setOrderingNotes(e.target.value)}
                placeholder="e.g. Order Sunday night for Tuesday delivery"
                rows={2}
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Placement
            </h2>
            <div>
              <label
                htmlFor="placement-method"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Order placement method
              </label>
              <select
                id="placement-method"
                value={placementMethod}
                onChange={(e) =>
                  setPlacementMethod(e.target.value as PlacementMethod)
                }
                className="mt-1.5 w-full min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="portal">Portal (vendor website)</option>
                <option value="other">Other</option>
              </select>
            </div>
            {placementMethod === 'sms' || placementMethod === 'email' ? (
              <div>
                <label
                  htmlFor="destination"
                  className="text-xs font-semibold uppercase tracking-wide text-stone-600"
                >
                  Destination
                  <span className="ml-0.5 text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value)
                    clearFieldError('destination')
                  }}
                  placeholder="Phone number, email, or URL"
                  className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
                {fieldErrors.destination ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.destination}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="vendor-notes"
                  className="text-xs font-semibold uppercase tracking-wide text-stone-600"
                >
                  {placementMethod === 'portal'
                    ? 'Portal notes (optional)'
                    : 'Notes (optional)'}
                </label>
                <textarea
                  id="vendor-notes"
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  placeholder={
                    placementMethod === 'portal'
                      ? 'e.g. Login at vendor.com — Customer #13749'
                      : 'e.g. Drop off order sheet on Tuesdays'
                  }
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
                />
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Capabilities
            </h2>
            <CapabilityToggle
              id="cap-addons"
              label="Supports add-ons"
              checked={supportsAddons}
              onChange={setSupportsAddons}
            />
            <CapabilityToggle
              id="cap-standing"
              label="Supports standing orders"
              checked={supportsStandingOrders}
              onChange={setSupportsStandingOrders}
            />
            <CapabilityToggle
              id="cap-history"
              label="Supports history suggestions"
              checked={supportsHistorySuggestions}
              onChange={setSupportsHistorySuggestions}
            />
          </section>

          {submitError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-11 rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DayPillGroup({
  label,
  required: isRequired,
  selected,
  onToggle,
}: {
  label: string
  required?: boolean
  selected: string[]
  onToggle: (day: string) => void
}) {
  const set = new Set(selected)
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
        {label}
        {isRequired ? (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const isSelected = set.has(day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggle(day)}
              className={`min-h-11 min-w-[3.25rem] touch-manipulation rounded-full border px-3 text-xs font-medium ${
                isSelected
                  ? 'border-stone-700 bg-stone-800 text-stone-50'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CapabilityToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 touch-manipulation"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-stone-400 text-stone-800 focus:ring-stone-500"
      />
      <span className="text-sm text-stone-800">{label}</span>
    </label>
  )
}
