import { useState, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib'

type Props = { onBack: () => void }

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const STEP_TITLES = [
  'Basic info',
  'Order settings',
  'Catalog',
  'Capabilities',
  'Review',
] as const

type PlacementMethod = 'sms' | 'email' | 'portal' | 'other'

type CatalogRow = { name: string; unit: string; pack_size: string }

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
  | 'destination'
  | 'order_days'
  | 'available_delivery_days'
  | 'preferred_delivery_days'
  | 'order_cutoff_time'

type CatalogSource = 'skip' | 'upload'

function normalizeHeaderKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function rowFromSheetObject(row: Record<string, unknown>): CatalogRow {
  const norm: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    norm[normalizeHeaderKey(k)] = String(v ?? '').trim()
  }
  return {
    name: norm.name ?? '',
    unit: norm.unit ?? '',
    pack_size: norm.pack_size ?? '',
  }
}

function parseCSV(text: string): CatalogRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const header = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const nameIdx = header.indexOf('name')
  const unitIdx = header.indexOf('unit')
  const packIdx = header.indexOf('pack_size')
  if (nameIdx < 0) return []
  const rows: CatalogRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    const name = cols[nameIdx] ?? ''
    if (!name) continue
    rows.push({
      name,
      unit: unitIdx >= 0 ? (cols[unitIdx] ?? '') : '',
      pack_size: packIdx >= 0 ? (cols[packIdx] ?? '') : '',
    })
  }
  return rows
}

function parseXLSX(buf: ArrayBuffer): CatalogRow[] {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })
  const rows: CatalogRow[] = []
  for (const obj of json) {
    const r = rowFromSheetObject(obj)
    if (r.name) rows.push(r)
  }
  return rows
}

function placementLabel(method: PlacementMethod): string {
  switch (method) {
    case 'sms':
      return 'SMS'
    case 'email':
      return 'Email'
    case 'portal':
      return 'Portal (vendor website)'
    case 'other':
      return 'Other'
  }
}

export function AddVendorScreen({ onBack }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [repName, setRepName] = useState('')
  const [placementMethod, setPlacementMethod] =
    useState<PlacementMethod>('sms')
  const [destination, setDestination] = useState('')
  const [vendorNotes, setVendorNotes] = useState('')

  const [orderDays, setOrderDays] = useState<string[]>([])
  const [availableDeliveryDays, setAvailableDeliveryDays] = useState<string[]>(
    [],
  )
  const [preferredDeliveryDays, setPreferredDeliveryDays] = useState<
    string[]
  >([])
  const [orderMinimum, setOrderMinimum] = useState('0')
  const [orderCutoffTime, setOrderCutoffTime] = useState('5:00 PM')

  const [catalogSource, setCatalogSource] = useState<CatalogSource>('skip')
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([])
  const [pendingCatalogRows, setPendingCatalogRows] = useState<CatalogRow[]>(
    [],
  )
  const [catalogPreviewOpen, setCatalogPreviewOpen] = useState(false)
  const [catalogParseError, setCatalogParseError] = useState<string | null>(
    null,
  )
  const [fileInputKey, setFileInputKey] = useState(0)

  const [supportsAddons, setSupportsAddons] = useState(false)
  const [supportsStandingOrders, setSupportsStandingOrders] = useState(false)
  const [supportsHistorySuggestions, setSupportsHistorySuggestions] =
    useState(false)

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  const validateStep1 = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!name.trim()) next.name = 'Vendor name is required.'
    if (!category.trim()) next.category = 'Category is required.'
    if (
      (placementMethod === 'sms' || placementMethod === 'email') &&
      !destination.trim()
    )
      next.destination = 'Destination is required.'
    setFieldErrors((prev) => {
      const merged = { ...prev }
      delete merged.name
      delete merged.category
      delete merged.destination
      return { ...merged, ...next }
    })
    return Object.keys(next).length === 0
  }

  const validateStep2 = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (orderDays.length === 0)
      next.order_days = 'Select at least one order day.'
    if (availableDeliveryDays.length === 0)
      next.available_delivery_days =
        'Select at least one available delivery day.'
    if (preferredDeliveryDays.length === 0)
      next.preferred_delivery_days =
        'Select at least one preferred delivery day.'
    if (!orderCutoffTime.trim())
      next.order_cutoff_time = 'Order cutoff time is required.'
    setFieldErrors((prev) => {
      const merged = { ...prev }
      delete merged.order_days
      delete merged.available_delivery_days
      delete merged.preferred_delivery_days
      delete merged.order_cutoff_time
      return { ...merged, ...next }
    })
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return
      setStep(2)
      return
    }
    if (step === 2) {
      if (!validateStep2()) return
      setStep(3)
      return
    }
    if (step === 3) {
      setCatalogPreviewOpen(false)
      setPendingCatalogRows([])
      setCatalogParseError(null)
      setFileInputKey((k) => k + 1)
      setStep(4)
      return
    }
    if (step === 4) {
      setStep(5)
    }
  }

  const goBack = () => {
    if (step <= 1) return
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))
  }

  const selectCatalogSkip = () => {
    setCatalogSource('skip')
    setCatalogRows([])
    setCatalogPreviewOpen(false)
    setPendingCatalogRows([])
    setCatalogParseError(null)
    setFileInputKey((k) => k + 1)
  }

  const selectCatalogUpload = () => {
    setCatalogSource('upload')
    setCatalogParseError(null)
  }

  const handleCatalogFile = async (file: File | null) => {
    if (!file) return
    setCatalogParseError(null)
    const lower = file.name.toLowerCase()
    try {
      let rows: CatalogRow[] = []
      if (lower.endsWith('.csv')) {
        const text = await file.text()
        rows = parseCSV(text)
      } else if (lower.endsWith('.xlsx')) {
        const buf = await file.arrayBuffer()
        rows = parseXLSX(buf)
      } else {
        setCatalogParseError('Please choose a .csv or .xlsx file.')
        return
      }
      if (rows.length === 0) {
        setCatalogParseError(
          'No data rows found. Expected columns: name, unit, pack_size (optional).',
        )
        return
      }
      setPendingCatalogRows(rows)
      setCatalogPreviewOpen(true)
    } catch {
      setCatalogParseError('Could not read that file. Try another format.')
    }
  }

  const confirmCatalogImport = () => {
    setCatalogRows(pendingCatalogRows)
    setCatalogPreviewOpen(false)
    setPendingCatalogRows([])
    setCatalogParseError(null)
    setFileInputKey((k) => k + 1)
  }

  const cancelCatalogPreview = () => {
    setCatalogPreviewOpen(false)
    setPendingCatalogRows([])
    setCatalogParseError(null)
    setFileInputKey((k) => k + 1)
  }

  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    const minParsed = parseFloat(orderMinimum.trim())
    const orderMinimumNum =
      orderMinimum.trim() === '' || Number.isNaN(minParsed) ? 0 : minParsed

    setSaving(true)
    const { data: inserted, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        restaurant_id: RESTAURANT_ID,
        name: name.trim(),
        category: category.trim(),
        rep_name: repName.trim(),
        order_days: orderDays,
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
      .select('id')
      .single()

    if (vendorError || !inserted?.id) {
      setSaving(false)
      setSubmitError(vendorError?.message ?? 'Failed to create vendor.')
      return
    }

    const newVendorId = inserted.id as string

    if (catalogRows.length > 0) {
      const catalogPayload = catalogRows.map((row, index) => ({
        vendor_id: newVendorId,
        restaurant_id: RESTAURANT_ID,
        name: row.name,
        unit: row.unit || '',
        pack_size: row.pack_size.trim() === '' ? null : row.pack_size,
        display_order: index,
      }))

      const { error: catalogError } = await supabase
        .from('vendor_catalog_items')
        .insert(catalogPayload)

      if (catalogError) {
        setSaving(false)
        setSubmitError(catalogError.message)
        return
      }
    }

    setSaving(false)
    onBack()
  }

  const orderMinDisplay =
    orderMinimum.trim() === '' || Number.isNaN(parseFloat(orderMinimum))
      ? '$0'
      : `$${orderMinimum.trim()}`

  const enabledCapabilities: string[] = []
  if (supportsAddons) enabledCapabilities.push('Supports add-ons')
  if (supportsStandingOrders) enabledCapabilities.push('Supports standing orders')
  if (supportsHistorySuggestions)
    enabledCapabilities.push('Supports history suggestions')

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
          Create a vendor profile and save it to your restaurant.
        </p>

        <div className="mt-6">
          <StepIndicator
            current={step}
            total={5}
            title={STEP_TITLES[step - 1]}
          />
        </div>

        {(step === 1 || step === 2) && (
          <p className="mt-4 text-xs text-stone-500">
            Fields marked <span className="text-red-500">*</span> are
            required.
          </p>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
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
                placeholder="e.g. Meat, Dry Goods"
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
                onChange={(e) => setRepName(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
              />
            </div>
            <div>
              <label
                htmlFor="placement-method"
                className="text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                Order placement method
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
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
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <DayPillGroup
              label="Order days"
              required
              selected={orderDays}
              onToggle={(day) => {
                toggleDay(day, orderDays, setOrderDays)
                clearFieldError('order_days')
              }}
            />
            {fieldErrors.order_days ? (
              <p className="text-xs text-red-600">{fieldErrors.order_days}</p>
            ) : null}

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
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-stone-600">
              Choose how to set up this vendor&apos;s catalog.
            </p>

            <div className="space-y-3">
              <div
                className={`rounded-lg border-2 p-4 ${
                  catalogSource === 'upload'
                    ? 'border-stone-900 bg-white'
                    : 'border-stone-200 bg-white/60'
                }`}
              >
                <button
                  type="button"
                  onClick={selectCatalogUpload}
                  className="w-full text-left touch-manipulation cursor-pointer"
                >
                  <p className="font-semibold text-stone-900">
                    Upload CSV or Excel
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Import your vendor&apos;s product list
                  </p>
                </button>

                {catalogSource === 'upload' && (
                  <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                    {!(
                      catalogRows.length > 0 && !catalogPreviewOpen
                    ) && (
                      <>
                        <input
                          key={fileInputKey}
                          type="file"
                          accept=".csv,.xlsx"
                          onChange={(e) => {
                            void handleCatalogFile(e.target.files?.[0] ?? null)
                            e.target.value = ''
                          }}
                          className="w-full text-sm text-stone-800 file:mr-3 file:rounded-md file:border file:border-stone-300 file:bg-white file:px-3 file:py-2 file:text-sm"
                        />
                        {catalogParseError ? (
                          <p className="text-xs text-red-600">
                            {catalogParseError}
                          </p>
                        ) : null}
                      </>
                    )}

                    {catalogRows.length > 0 && !catalogPreviewOpen ? (
                      <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                        <span className="text-green-700 text-sm font-medium">
                          ✓ {catalogRows.length} items ready to import
                        </span>
                        <button
                          type="button"
                          onClick={selectCatalogSkip}
                          className="ml-auto text-xs text-stone-500 hover:text-stone-800 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}

                    {catalogPreviewOpen && pendingCatalogRows.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-3">
                        <p className="text-xs font-semibold text-stone-700">
                          Preview (showing{' '}
                          {Math.min(10, pendingCatalogRows.length)} of{' '}
                          {pendingCatalogRows.length} rows)
                        </p>
                        <div className="max-h-64 overflow-auto">
                          <table className="w-full text-left text-xs text-stone-800">
                            <thead>
                              <tr className="border-b border-stone-200">
                                <th className="py-1 pr-2 font-semibold">
                                  name
                                </th>
                                <th className="py-1 pr-2 font-semibold">
                                  unit
                                </th>
                                <th className="py-1 font-semibold">
                                  pack_size
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingCatalogRows.slice(0, 10).map((r, i) => (
                                <tr key={i} className="border-b border-stone-100">
                                  <td className="py-1 pr-2 break-words">
                                    {r.name}
                                  </td>
                                  <td className="py-1 pr-2">{r.unit}</td>
                                  <td className="py-1 break-words">
                                    {r.pack_size}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={confirmCatalogImport}
                            className="flex-1 rounded-md bg-stone-900 py-2 text-sm font-semibold text-stone-50"
                          >
                            Confirm import
                          </button>
                          <button
                            type="button"
                            onClick={cancelCatalogPreview}
                            className="flex-1 rounded-md border border-stone-300 bg-white py-2 text-sm font-semibold text-stone-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={selectCatalogSkip}
                className={`w-full rounded-lg border-2 p-4 text-left touch-manipulation ${
                  catalogSource === 'skip'
                    ? 'cursor-pointer border-stone-900 bg-white'
                    : 'cursor-pointer border-stone-200 bg-white/60'
                }`}
              >
                <p className="font-semibold text-stone-900">Skip for now</p>
                <p className="mt-1 text-sm text-stone-600">
                  I&apos;ll add catalog items manually later
                </p>
              </button>

              <div
                className="relative w-full rounded-lg border-2 border-stone-200 bg-stone-100 p-4 opacity-60 cursor-not-allowed"
                aria-disabled="true"
              >
                <span className="absolute right-3 top-3 rounded-full bg-stone-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700">
                  Coming soon
                </span>
                <p className="font-semibold text-stone-700">
                  Use platform catalog
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Coming soon — platform-managed catalogs for common vendors
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-3">
            <CapabilityToggle
              id="wiz-cap-addons"
              label="Supports add-ons"
              checked={supportsAddons}
              onChange={setSupportsAddons}
            />
            <CapabilityToggle
              id="wiz-cap-standing"
              label="Supports standing orders"
              checked={supportsStandingOrders}
              onChange={setSupportsStandingOrders}
            />
            <CapabilityToggle
              id="wiz-cap-history"
              label="Supports history suggestions"
              checked={supportsHistorySuggestions}
              onChange={setSupportsHistorySuggestions}
            />
            <p className="pt-2 text-sm leading-relaxed text-stone-600">
              These settings control which features are available for this vendor
              in the ordering workspace.
            </p>
          </div>
        )}

        {step === 5 && (
          <form className="mt-6 space-y-6" onSubmit={handleFinalSubmit}>
            <div className="space-y-4 text-sm text-stone-800">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Basic info
                </h3>
                <ul className="mt-2 space-y-1 text-stone-700">
                  <li>
                    <span className="text-stone-500">Vendor name:</span>{' '}
                    {name.trim()}
                  </li>
                  <li>
                    <span className="text-stone-500">Category:</span>{' '}
                    {category.trim()}
                  </li>
                  <li>
                    <span className="text-stone-500">Rep name:</span>{' '}
                    {repName.trim() ? repName.trim() : '—'}
                  </li>
                  <li>
                    <span className="text-stone-500">Placement:</span>{' '}
                    {placementLabel(placementMethod)} →{' '}
                    {placementMethod === 'portal' ||
                    placementMethod === 'other'
                      ? vendorNotes.trim() || '—'
                      : destination.trim()}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Order settings
                </h3>
                <ul className="mt-2 space-y-1 text-stone-700">
                  <li>
                    <span className="text-stone-500">Order days:</span>{' '}
                    {orderDays.join(' / ') || '—'}
                  </li>
                  <li>
                    <span className="text-stone-500">
                      Available delivery days:
                    </span>{' '}
                    {availableDeliveryDays.join(' / ') || '—'}
                  </li>
                  <li>
                    <span className="text-stone-500">
                      Preferred delivery days:
                    </span>{' '}
                    {preferredDeliveryDays.join(' / ') || '—'}
                  </li>
                  <li>
                    <span className="text-stone-500">Order minimum:</span>{' '}
                    {orderMinDisplay}
                  </li>
                  <li>
                    <span className="text-stone-500">Cutoff time:</span>{' '}
                    {orderCutoffTime}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Catalog
                </h3>
                <p className="mt-2 text-stone-700">
                  {catalogRows.length > 0
                    ? `${catalogRows.length} items ready to import`
                    : 'No catalog — can be added later'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Capabilities
                </h3>
                <p className="mt-2 text-stone-700">
                  {enabledCapabilities.length > 0
                    ? enabledCapabilities.join(', ')
                    : 'None'}
                </p>
              </div>
            </div>

            {submitError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {submitError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="w-full rounded-md border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save vendor'}
            </button>
          </form>
        )}

        {step < 5 && (
          <div className="mt-8 space-y-3">
            {step >= 2 && (
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-md border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="w-full rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 hover:bg-stone-800"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepIndicator({
  current,
  total,
  title,
}: {
  current: number
  total: number
  title: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2" role="status" aria-live="polite">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const isCurrent = n === current
          const isCompleted = n < current
          return (
            <div
              key={n}
              className={
                isCurrent
                  ? 'h-3 w-3 shrink-0 rounded-full bg-stone-900'
                  : isCompleted
                    ? 'h-3 w-3 shrink-0 rounded-full bg-stone-400'
                    : 'h-3 w-3 shrink-0 rounded-full border border-stone-400 bg-transparent'
              }
              aria-label={`Step ${n}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            />
          )
        })}
      </div>
      <p className="text-center text-sm font-semibold text-stone-900">
        {title}
      </p>
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
