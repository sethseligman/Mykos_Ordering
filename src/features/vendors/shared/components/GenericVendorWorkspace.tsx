import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '../../../../lib'
import { buildOrderMessage } from '../../../../lib/buildOrderMessage'
import type { OrderDraft, OrderItem, OrderStatus, VendorItem } from '../../../../types/order'
import { saveDraftToSupabase } from '../draftQueries'
import { saveFinalizedOrderToSupabase } from '../finalizedOrderQueries'
import {
  mapSupabaseVendorRowToVendor,
  type SupabaseVendorRow,
} from '../vendorQueries'
import {
  orderedCatalogIdsForChecklist,
  sortOrderItemsByCatalogOrder,
  type OrderChecklistSortMode,
} from '../orderChecklistSort'
import {
  defaultDeliveryDateForScheduling,
  useChecklistDateRebuildPrompt,
  validateVendorDeliveryDate,
} from '../vendorScheduling'
import type { VendorSchedulingRules, Weekday } from '../vendorScheduling/types'
import { ChecklistDateRebuildPrompt } from './ChecklistDateRebuildPrompt'
import { OrderCartSummaryPanel } from './OrderCartSummaryPanel'
import { OrderChecklistQuickActions } from './OrderChecklistQuickActions'
import { OrderPlacementConfirmModal } from './OrderPlacementConfirmModal'
import { QuantityInputWithArrows } from './QuantityInputWithArrows'
import { SortChecklistToolbar } from './SortChecklistToolbar'
import { VendorDeliveryDateBanner } from './VendorDeliveryDateBanner'
import { VendorHeader } from './VendorHeader'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

const WEEKDAY_MAP: Record<string, Weekday> = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
}

type Props = {
  vendorId: string
  onBack: () => void
}

type TabId = 'current' | 'history'

type CatalogItemRow = {
  id: string
  vendor_id: string
  restaurant_id: string
  name: string
  unit: string
  pack_size: string | null
  display_order: number
}

type FinalizedOrderRow = {
  id: string
  delivery_date: string
  sent_at: string
  message_text: string
  items: unknown
}

function toWeekdays(days: string[]): Weekday[] {
  const out: Weekday[] = []
  for (const d of days) {
    const w = WEEKDAY_MAP[d.trim().toLowerCase()]
    if (w) out.push(w)
  }
  return out
}

function schedulingRulesFromRow(
  row: SupabaseVendorRow,
): VendorSchedulingRules {
  let validDeliveryDays = toWeekdays(row.available_delivery_days)
  if (validDeliveryDays.length === 0) {
    validDeliveryDays = toWeekdays(row.preferred_delivery_days)
  }
  if (validDeliveryDays.length === 0) {
    validDeliveryDays = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
  }
  const validOrderDays = toWeekdays(row.order_days)
  return {
    vendorId: row.id,
    vendorDisplayName: row.name,
    validDeliveryDays,
    validOrderDays: validOrderDays.length > 0 ? validOrderDays : undefined,
    invalidDateStrategy: 'suggest_next_valid_date',
  }
}

function catalogRowsToVendorItems(rows: CatalogItemRow[]): VendorItem[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit || '',
    packSize: r.pack_size?.trim() ? r.pack_size : undefined,
  }))
}

function buildEmptyOrderItems(catalog: VendorItem[]): OrderItem[] {
  return catalog.map((c) => ({
    vendorItemId: c.id,
    included: false,
    quantity: '',
    unit: c.unit,
  }))
}

function mergeDraftWithCatalog(
  parsed: OrderDraft | null,
  catalog: VendorItem[],
  vendorId: string,
  deliveryDate: string,
  repFirstName: string,
): OrderDraft {
  const template = buildEmptyOrderItems(catalog)
  if (!parsed || parsed.vendorId !== vendorId) {
    return {
      vendorId,
      deliveryDate,
      repFirstName,
      items: template,
      internalNotes: '',
      vendorNotes: '',
      status: 'draft',
    }
  }
  const prevById = new Map(parsed.items.map((i) => [i.vendorItemId, i]))
  const items = template.map((row) => {
    const p = prevById.get(row.vendorItemId)
    if (!p) return row
    return {
      ...row,
      included: p.included,
      quantity: p.quantity,
      unit: p.unit.trim() ? p.unit : row.unit,
    }
  })
  return {
    ...parsed,
    vendorId,
    deliveryDate: parsed.deliveryDate || deliveryDate,
    repFirstName: parsed.repFirstName?.trim() || repFirstName,
    items,
  }
}

function readDraftFromStorage(
  key: string,
  catalog: VendorItem[],
  vendorId: string,
  defaultDate: string,
  repFirst: string,
): OrderDraft {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return mergeDraftWithCatalog(null, catalog, vendorId, defaultDate, repFirst)
    }
    const parsed = JSON.parse(raw) as OrderDraft
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      return mergeDraftWithCatalog(null, catalog, vendorId, defaultDate, repFirst)
    }
    return mergeDraftWithCatalog(parsed, catalog, vendorId, defaultDate, repFirst)
  } catch {
    return mergeDraftWithCatalog(null, catalog, vendorId, defaultDate, repFirst)
  }
}

function countIncludedItems(itemsJson: unknown): number {
  if (!itemsJson || typeof itemsJson !== 'object' || Array.isArray(itemsJson)) {
    return 0
  }
  const obj = itemsJson as Record<string, unknown>
  if (!Array.isArray(obj.items)) return 0
  return obj.items.filter(
    (i) =>
      i &&
      typeof i === 'object' &&
      (i as OrderItem).included === true,
  ).length
}

const statusStyles: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  },
  sent: {
    label: 'Sent',
    className: 'bg-stone-200 text-stone-800 ring-1 ring-stone-300/80',
  },
}

export function GenericVendorWorkspace({ vendorId, onBack }: Props) {
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vendorRow, setVendorRow] = useState<SupabaseVendorRow | null>(null)
  const [catalogRows, setCatalogRows] = useState<CatalogItemRow[]>([])
  const [tab, setTab] = useState<TabId>('current')
  const [draft, setDraft] = useState<OrderDraft | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null)
  const [copyAcknowledged, setCopyAcknowledged] = useState(false)
  const [checklistSortMode, setChecklistSortMode] =
    useState<OrderChecklistSortMode>('alphabetical')
  const [historyRows, setHistoryRows] = useState<FinalizedOrderRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [placementConfirmOpen, setPlacementConfirmOpen] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const draftStorageKey = `ordering-app:draft:${vendorId}`

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadState('loading')
      setLoadError(null)

      const vendorRes = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single()

      if (cancelled) return
      if (vendorRes.error || !vendorRes.data) {
        setLoadState('error')
        setLoadError(
          vendorRes.error?.message ?? 'Could not load vendor.',
        )
        return
      }

      const catRes = await supabase
        .from('vendor_catalog_items')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('restaurant_id', RESTAURANT_ID)
        .order('display_order', { ascending: true })

      if (cancelled) return
      if (catRes.error) {
        setLoadState('error')
        setLoadError(catRes.error.message)
        return
      }

      const row = vendorRes.data as SupabaseVendorRow
      const cats = (catRes.data ?? []) as CatalogItemRow[]
      setVendorRow(row)
      setCatalogRows(cats)
      setLoadState('ready')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [vendorId])

  const catalog = useMemo(
    () => catalogRowsToVendorItems(catalogRows),
    [catalogRows],
  )

  const vendor = useMemo(
    () => (vendorRow ? mapSupabaseVendorRowToVendor(vendorRow) : null),
    [vendorRow],
  )

  const schedulingRules = useMemo(
    () => (vendorRow ? schedulingRulesFromRow(vendorRow) : null),
    [vendorRow],
  )

  useEffect(() => {
    if (loadState !== 'ready' || !vendor || !schedulingRules) return
    const defaultDate = defaultDeliveryDateForScheduling(schedulingRules)
    setDraft(
      readDraftFromStorage(
        draftStorageKey,
        catalog,
        vendorId,
        defaultDate,
        vendor.primaryRepFirstName,
      ),
    )
  }, [loadState, vendor, schedulingRules, catalog, vendorId, draftStorageKey])

  const persistDraft = useCallback(
    (next: OrderDraft) => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      void saveDraftToSupabase(vendorId, next)
    },
    [draftStorageKey, vendorId],
  )

  useEffect(() => {
    if (draft != null) persistDraft(draft)
  }, [draft, persistDraft])

  const scheduleValidation = useMemo(() => {
    if (!schedulingRules || !draft) {
      return {
        isValid: true,
        weekday: null,
        suggestedNextValidDate: null,
        applyStandingOrders: false,
        applyHistorySuggestions: false,
        blocksPrimaryActions: false,
      } as const
    }
    return validateVendorDeliveryDate(schedulingRules, draft.deliveryDate)
  }, [draft, schedulingRules])

  const disableOutboundActions =
    draft != null &&
    !scheduleValidation.isValid &&
    schedulingRules?.invalidDateStrategy !== 'allow_blank_order'

  const lockChecklist =
    draft != null &&
    !scheduleValidation.isValid &&
    schedulingRules?.invalidDateStrategy === 'block_order'

  const checklistRebuild = useChecklistDateRebuildPrompt({
    deliveryDate: draft?.deliveryDate ?? '',
    isDeliveryDateValid: scheduleValidation.isValid,
  })

  const checklistOrderedIds = useMemo(
    () =>
      orderedCatalogIdsForChecklist(catalog, [], checklistSortMode),
    [catalog, checklistSortMode],
  )

  const checklistDisplayItems = useMemo(() => {
    if (!draft) return []
    return sortOrderItemsByCatalogOrder(draft.items, checklistOrderedIds)
  }, [draft, checklistOrderedIds])

  const previewText = useMemo(() => {
    if (!draft || !vendor) return ''
    return buildOrderMessage(vendor, catalog, draft)
  }, [draft, vendor, catalog])

  const bumpDraft = useCallback(
    (updater: (prev: OrderDraft) => OrderDraft) => {
      setLastGeneratedAt(null)
      setDraft((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        if (prev.status === 'ready' || prev.status === 'sent') {
          return { ...next, status: 'draft' }
        }
        return next
      })
    },
    [],
  )

  const patchItem = (vendorItemId: string, patch: Partial<OrderItem>) => {
    bumpDraft((d) => ({
      ...d,
      items: d.items.map((row) =>
        row.vendorItemId === vendorItemId ? { ...row, ...patch } : row,
      ),
    }))
  }

  const clearAllItems = () => {
    bumpDraft((d) => ({
      ...d,
      items: buildEmptyOrderItems(catalog),
    }))
    checklistRebuild.markChecklistRebuiltForCurrentDate()
  }

  const handleGenerate = () => {
    if (!draft || disableOutboundActions) return
    setDraft({ ...draft, status: 'ready' })
    setLastGeneratedAt(Date.now())
  }

  const handleCopy = async () => {
    if (!draft || disableOutboundActions) return
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current)
      copyResetRef.current = null
    }
    try {
      await navigator.clipboard.writeText(previewText)
      setCopyAcknowledged(true)
      copyResetRef.current = setTimeout(() => {
        setCopyAcknowledged(false)
        copyResetRef.current = null
      }, 1500)
    } catch {
      setCopyAcknowledged(false)
    }
  }

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from('finalized_orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('restaurant_id', RESTAURANT_ID)
      .order('sent_at', { ascending: false })
      .limit(20)

    setHistoryLoading(false)
    if (error) {
      console.error(error.message)
      setHistoryRows([])
      return
    }
    setHistoryRows((data ?? []) as FinalizedOrderRow[])
  }, [vendorId])

  useEffect(() => {
    if (tab === 'history' && loadState === 'ready') void loadHistory()
  }, [tab, loadState, loadHistory])

  const handleMarkSent = () => {
    if (!draft || draft.status !== 'ready' || disableOutboundActions) return
    if (!vendorRow) return
    const now = Date.now()
    const channel =
      vendorRow.order_placement_method === 'email' ||
      vendorRow.order_placement_method === 'portal'
        ? vendorRow.order_placement_method
        : 'sms'
    const sentDraft: OrderDraft = { ...draft, status: 'sent' }
    void saveFinalizedOrderToSupabase({
      supabaseVendorId: vendorId,
      draft: sentDraft,
      messageText: previewText,
      channel,
      sentAt: now,
    })
    setDraft(sentDraft)
    void loadHistory()
  }

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold sm:text-sm ${
        tab === id
          ? 'border-stone-600 bg-stone-800 text-stone-50'
          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  )

  if (loadState === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e4dc] font-sans text-stone-800">
        <p className="text-sm text-stone-600">Loading…</p>
      </div>
    )
  }

  if (loadState === 'error' || !vendor || !vendorRow || !schedulingRules) {
    return (
      <div className="min-h-dvh bg-[#e8e4dc] px-3 py-6 font-sans text-stone-800 sm:px-6">
        <div className="mx-auto max-w-lg space-y-4">
          <p className="text-sm text-red-800">{loadError ?? 'Something went wrong.'}</p>
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

  if (draft === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e4dc] font-sans text-stone-800">
        <p className="text-sm text-stone-600">Loading…</p>
      </div>
    )
  }

  const statusUi = statusStyles[draft.status]
  const placementMethod = vendorRow.order_placement_method

  return (
    <div className="min-h-dvh bg-[#e8e4dc] font-sans text-stone-800">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          ← Back to portal
        </button>

        <div className="overflow-hidden rounded-lg border border-stone-400/90 bg-[#f7f5f0] shadow-sm">
          <VendorHeader vendor={vendor} />

          <div
            className="border-b border-stone-200 bg-stone-100/70 px-3 py-3 sm:px-4"
            role="tablist"
            aria-label="Vendor sections"
          >
            <div className="flex flex-wrap gap-2">
              {tabBtn('current', 'Current order')}
              {tabBtn('history', 'History')}
            </div>
          </div>

          <div className="p-3 sm:p-4" role="tabpanel">
            {tab === 'current' && (
              <>
                <VendorDeliveryDateBanner
                  validation={scheduleValidation}
                  invalidDateStrategy={schedulingRules.invalidDateStrategy}
                  onUseSuggestedDate={(iso) =>
                    bumpDraft((d) => ({ ...d, deliveryDate: iso }))
                  }
                />

                <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-xs font-semibold text-stone-600">
                    Delivery date
                    <input
                      type="date"
                      value={draft.deliveryDate}
                      disabled={lockChecklist}
                      onChange={(e) =>
                        bumpDraft((d) => ({
                          ...d,
                          deliveryDate: e.target.value,
                        }))
                      }
                      className="mt-1 w-full max-w-xs rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusUi.className}`}
                    >
                      {statusUi.label}
                    </span>
                    {lastGeneratedAt != null &&
                      (draft.status === 'ready' || draft.status === 'sent') && (
                        <span className="text-xs text-stone-500">
                          Generated{' '}
                          {new Date(lastGeneratedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                  </div>
                </div>

                <ChecklistDateRebuildPrompt
                  pendingRebuildDate={checklistRebuild.pendingRebuildDate}
                  onRebuild={() => {
                    checklistRebuild.markChecklistRebuiltForCurrentDate()
                  }}
                  onKeepCurrent={() =>
                    checklistRebuild.keepCurrentDraftForCurrentDate()
                  }
                />

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1 pb-40 lg:pb-0">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Order checklist
                    </h2>
                    <OrderChecklistQuickActions
                      onApplyFromHistory={() => {}}
                      onClearAll={clearAllItems}
                      applyFromHistoryEnabled={false}
                      applyFromHistoryTitle="Not available for generic vendors"
                      hint="Apply from history is not available for this vendor yet."
                    />
                    <SortChecklistToolbar
                      mode={checklistSortMode}
                      onChangeMode={setChecklistSortMode}
                    />

                    {catalog.length === 0 ? (
                      <p className="rounded-md border border-stone-200 bg-white/80 px-4 py-6 text-center text-sm text-stone-600">
                        No catalog items yet. Import a catalog from Vendor Admin.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-md border border-stone-300 bg-white shadow-inner">
                        <table className="min-w-full text-left text-sm text-stone-800">
                          <thead className="border-b border-stone-200 bg-stone-100/80 text-xs font-semibold uppercase tracking-wide text-stone-600">
                            <tr>
                              <th className="w-10 px-2 py-2" scope="col">
                                <span className="sr-only">Include</span>
                              </th>
                              <th className="px-2 py-2" scope="col">
                                Item
                              </th>
                              <th className="w-28 px-2 py-2" scope="col">
                                Qty
                              </th>
                              <th className="w-24 px-2 py-2" scope="col">
                                Unit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {checklistDisplayItems.map((row) => {
                              const cat = catalog.find(
                                (c) => c.id === row.vendorItemId,
                              )
                              const label = cat?.name ?? row.vendorItemId
                              return (
                                <tr
                                  key={row.vendorItemId}
                                  className="border-b border-stone-100 last:border-0"
                                >
                                  <td className="px-2 py-2 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={row.included}
                                      disabled={lockChecklist}
                                      onChange={(e) =>
                                        patchItem(row.vendorItemId, {
                                          included: e.target.checked,
                                        })
                                      }
                                      aria-label={`Include ${label}`}
                                      className="h-4 w-4 rounded border-stone-400"
                                    />
                                  </td>
                                  <td className="px-2 py-2 align-middle font-medium break-words">
                                    {label}
                                  </td>
                                  <td className="px-2 py-2 align-middle">
                                    <QuantityInputWithArrows
                                      value={row.quantity}
                                      onChangeValue={(q) =>
                                        patchItem(row.vendorItemId, {
                                          quantity: q,
                                          included:
                                            q.trim() !== '' ? true : row.included,
                                        })
                                      }
                                      disabled={lockChecklist}
                                      quantityLabel={label}
                                    />
                                  </td>
                                  <td className="px-2 py-2 align-middle text-xs text-stone-600">
                                    {row.unit}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="w-full shrink-0 space-y-3 lg:w-72">
                    <OrderCartSummaryPanel
                      items={draft.items}
                      catalog={catalog}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-4 border-t border-stone-300 bg-[#f7f5f0] px-4 pt-3 pb-6 lg:static lg:z-auto lg:border-t-0 lg:bg-transparent lg:p-0">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={disableOutboundActions || catalog.length === 0}
                          onClick={handleGenerate}
                          className="w-full rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Generate order text
                        </button>
                        <button
                          type="button"
                          disabled={disableOutboundActions || draft.status !== 'ready'}
                          onClick={() => void handleCopy()}
                          className="w-full rounded-md border border-stone-300 bg-white py-2.5 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {copyAcknowledged ? 'Copied!' : 'Copy order text'}
                        </button>
                        <button
                          type="button"
                          disabled={
                            disableOutboundActions ||
                            draft.status !== 'ready'
                          }
                          onClick={handleMarkSent}
                          className="w-full rounded-md border border-stone-600 bg-stone-100 py-2.5 text-sm font-semibold text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark as sent
                        </button>
                        {placementMethod === 'sms' ||
                        placementMethod === 'email' ? (
                          <button
                            type="button"
                            disabled={disableOutboundActions || draft.status !== 'ready'}
                            onClick={() => setPlacementConfirmOpen(true)}
                            className="w-full rounded-md border border-stone-300 bg-white py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                          >
                            Preview placement
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <OrderPlacementConfirmModal
                  isOpen={placementConfirmOpen}
                  vendorName={vendor.name}
                  deliveryDate={draft.deliveryDate}
                  method={placementMethod}
                  destination={vendorRow.destination}
                  previewText={previewText}
                  onClose={() => setPlacementConfirmOpen(false)}
                  onPrint={() => window.print()}
                  onConfirmSend={() => setPlacementConfirmOpen(false)}
                />
              </>
            )}

            {tab === 'history' && (
              <div className="space-y-3">
                {historyLoading ? (
                  <p className="text-sm text-stone-600">Loading history…</p>
                ) : historyRows.length === 0 ? (
                  <p className="text-sm text-stone-600">No order history yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {historyRows.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-md border border-stone-200 bg-white p-3 text-sm shadow-sm"
                      >
                        <p className="font-medium text-stone-900">
                          Delivery {h.delivery_date}
                        </p>
                        <p className="text-xs text-stone-500">
                          Sent{' '}
                          {new Date(h.sent_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {' · '}
                          {countIncludedItems(h.items)} items
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs text-stone-600 break-words">
                          {h.message_text.slice(0, 100)}
                          {h.message_text.length > 100 ? '…' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
