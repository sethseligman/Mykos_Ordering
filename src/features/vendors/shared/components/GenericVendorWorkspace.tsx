import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '../../../../lib'
import { buildOrderMessage } from '../../../../lib/buildOrderMessage'
import {
  readLastSentOrderSnapshot,
  writeLastSentOrderSnapshot,
} from '../../../../lib/lastSentOrderStorage'
import { applyLastSentBaselineToOrderItems } from '../../../../lib/orderItemBaseline'
import type { OrderDraft, OrderItem, OrderStatus, VendorItem } from '../../../../types/order'
import type { LastSentOrderSnapshot } from '../../../../types/lastSentOrder'
import {
  loadDraftWithTimestampFromSupabase,
  saveDraftToSupabase,
} from '../draftQueries'
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
import { generateSuggestedOrderItemsFromHistory } from '../vendorData/suggestOrderFromHistory'
import type { VendorHistoryOrder } from '../vendorData/types'
import {
  defaultDeliveryDateForScheduling,
  useChecklistDateRebuildPrompt,
  validateVendorDeliveryDate,
} from '../vendorScheduling'
import type { VendorSchedulingRules, Weekday } from '../vendorScheduling/types'
import { DeliveryDaysHint } from './DeliveryDaysHint'
import { FinalizeOrderModal } from './FinalizeOrderModal'
import { OrderCartSummaryPanel } from './OrderCartSummaryPanel'
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

/**
 * `finalized_orders.items` is the full OrderDraft JSON (see saveFinalizedOrderToSupabase),
 * not a bare OrderItem[]. Parse defensively before reading `draft.items`.
 */
function orderItemsFromFinalizedPayload(payload: unknown): OrderItem[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []
  const rec = payload as Record<string, unknown>
  const arr = rec.items
  if (!Array.isArray(arr)) return []
  /* Saved by this app as OrderItem[] inside the draft — validate at runtime only so far. */
  return arr as OrderItem[]
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
  const allWeek: Weekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  let vendorDeliveryDays = toWeekdays(row.available_delivery_days)
  if (vendorDeliveryDays.length === 0) {
    vendorDeliveryDays = allWeek
  }
  let preferredDeliveryDays = toWeekdays(row.preferred_delivery_days)
  if (preferredDeliveryDays.length === 0) {
    preferredDeliveryDays = toWeekdays(row.available_delivery_days)
  }
  if (preferredDeliveryDays.length === 0) {
    preferredDeliveryDays = allWeek
  }
  const validOrderDays = toWeekdays(row.order_days)
  return {
    vendorId: row.id,
    vendorDisplayName: row.name,
    vendorDeliveryDays,
    preferredDeliveryDays,
    validOrderDays: validOrderDays.length > 0 ? validOrderDays : undefined,
    cutoffTime: row.order_cutoff_time ?? undefined,
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

function resetItemsToBlank(
  items: OrderItem[],
  catalog: VendorItem[],
): OrderItem[] {
  const catalogIds = new Set(catalog.map((c) => c.id))
  return items.map((row) => {
    if (row.vendorItemId.startsWith('custom:')) return row
    if (!catalogIds.has(row.vendorItemId)) return row
    return {
      ...row,
      included: false,
      quantity: '',
    }
  })
}

function mergeDraftWithCatalog(
  parsed: OrderDraft | null,
  catalog: VendorItem[],
  vendorId: string,
  deliveryDate: string,
  repFirstName: string,
): OrderDraft {
  const template = buildEmptyOrderItems(catalog)
  const snapshot = readLastSentOrderSnapshot(vendorId)
  if (!parsed || parsed.vendorId !== vendorId) {
    return {
      vendorId,
      deliveryDate,
      repFirstName,
      items: resetItemsToBlank(
        applyLastSentBaselineToOrderItems(template, catalog, snapshot),
        catalog,
      ),
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
  const catalogIds = new Set(template.map((r) => r.vendorItemId))
  const customItems = parsed.items.filter(
    (i) => i.vendorItemId.startsWith('custom:') && !catalogIds.has(i.vendorItemId),
  )
  /* applyLastSentBaselineToOrderItems returns one row per catalog item only — append custom lines after. */
  const baselinedCatalogRows = applyLastSentBaselineToOrderItems(
    items,
    catalog,
    snapshot,
  )
  const finalItems = [...baselinedCatalogRows, ...customItems]
  return {
    ...parsed,
    vendorId,
    deliveryDate: parsed.deliveryDate || deliveryDate,
    repFirstName: parsed.repFirstName?.trim() || repFirstName,
    items: finalItems,
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
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveAck, setSaveAck] = useState(false)
  const saveResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [checklistSortMode, setChecklistSortMode] =
    useState<OrderChecklistSortMode>('alphabetical')
  const [historyRows, setHistoryRows] = useState<FinalizedOrderRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [suggestionHistory, setSuggestionHistory] = useState<VendorHistoryOrder[]>(
    [],
  )
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [customNames, setCustomNames] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [historyHint, setHistoryHint] = useState<string | null>(null)
  const historyHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftStorageKey = `ordering-app:draft:${vendorId}`
  const draftTimestampKey = `ordering-app:draft-ts:${vendorId}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(
        `ordering-app:custom-names:${vendorId}`,
      )
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, string>
        setCustomNames(new Map(Object.entries(obj)))
      } else {
        setCustomNames(new Map())
      }
    } catch {
      setCustomNames(new Map())
    }
    setShowAddItem(false)
    setNewItemName('')
    setNewItemQty('')
    setNewItemUnit('')
  }, [vendorId])

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

    // Set localStorage draft immediately for fast UI
    const localDraft = readDraftFromStorage(
      draftStorageKey,
      catalog,
      vendorId,
      defaultDate,
      vendor.primaryRepFirstName,
    )
    setDraft(localDraft)

    if (
      localStorage.getItem(draftStorageKey) &&
      !localStorage.getItem(draftTimestampKey)
    ) {
      localStorage.setItem(draftTimestampKey, Date.now().toString())
    }

    // Then check Supabase for a more recent draft
    void loadDraftWithTimestampFromSupabase(vendorId).then((remote) => {
      if (!remote) return

      const localTsRaw = localStorage.getItem(draftTimestampKey)
      const localTs = localTsRaw ? parseInt(localTsRaw, 10) : 0
      const remoteTs = new Date(remote.updatedAt).getTime()

      if (remoteTs > localTs) {
        const hydrated = mergeDraftWithCatalog(
          remote.draft,
          catalog,
          vendorId,
          defaultDate,
          vendor.primaryRepFirstName,
        )
        setDraft(hydrated)
        localStorage.setItem(draftStorageKey, JSON.stringify(hydrated))
        localStorage.setItem(draftTimestampKey, remoteTs.toString())
      }
    })
  }, [
    loadState,
    vendor,
    schedulingRules,
    catalog,
    vendorId,
    draftStorageKey,
    draftTimestampKey,
  ])

  const persistDraft = useCallback(
    (next: OrderDraft) => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(next))
        localStorage.setItem(draftTimestampKey, Date.now().toString())
      } catch {
        /* ignore */
      }
      void saveDraftToSupabase(vendorId, next)
    },
    [draftStorageKey, draftTimestampKey, vendorId],
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

  const hasIncludedItems =
    draft?.items.some(
      (i) => i.included && i.quantity.trim() !== '',
    ) ?? false

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
      orderedCatalogIdsForChecklist(
        catalog,
        suggestionHistory,
        checklistSortMode,
      ),
    [catalog, suggestionHistory, checklistSortMode],
  )

  const checklistDisplayItems = useMemo(() => {
    if (!draft) return []
    return sortOrderItemsByCatalogOrder(draft.items, checklistOrderedIds)
  }, [draft, checklistOrderedIds])

  const mergedCatalog = useMemo(() => {
    if (!draft) return catalog
    const customItems: VendorItem[] = draft.items
      .filter((i) => i.vendorItemId.startsWith('custom:'))
      .map((i) => ({
        id: i.vendorItemId,
        name: customNames.get(i.vendorItemId) ?? 'Custom item',
        unit: i.unit,
      }))
    return [...catalog, ...customItems]
  }, [catalog, draft, customNames])

  const previewText = useMemo(() => {
    if (!draft || !vendor) return ''
    return buildOrderMessage(vendor, mergedCatalog, draft)
  }, [draft, vendor, mergedCatalog])

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
    setCustomNames(new Map())
  }

  const handleBuildFromHistory = useCallback(() => {
    if (
      !scheduleValidation.isValid &&
      schedulingRules?.invalidDateStrategy === 'block_order'
    )
      return
    const suggested = generateSuggestedOrderItemsFromHistory(
      suggestionHistory,
      catalog,
    )
    const anyIncluded = suggested.some((i) => i.included)
    if (!anyIncluded) {
      setHistoryHint(
        suggestionHistory.length === 0
          ? 'No order history yet — place a few orders first.'
          : 'Not enough history yet — suggestions appear after a few more orders.',
      )
      if (historyHintTimerRef.current)
        clearTimeout(historyHintTimerRef.current)
      historyHintTimerRef.current = setTimeout(() => {
        setHistoryHint(null)
        historyHintTimerRef.current = null
      }, 4000)
      return
    }
    setHistoryHint(null)
    bumpDraft((d) => {
      const customs = d.items.filter((i) =>
        i.vendorItemId.startsWith('custom:'),
      )
      return { ...d, items: [...suggested, ...customs] }
    })
    checklistRebuild.markChecklistRebuiltForCurrentDate()
  }, [
    suggestionHistory,
    catalog,
    scheduleValidation.isValid,
    schedulingRules?.invalidDateStrategy,
    bumpDraft,
    checklistRebuild,
  ])

  const handleAddCustomItem = () => {
    const name = newItemName.trim()
    if (!name) return
    const id = 'custom:' + Math.random().toString(36).slice(2, 8)
    const newItem: OrderItem = {
      vendorItemId: id,
      included: true,
      quantity: newItemQty.trim(),
      unit: newItemUnit.trim() || 'each',
    }
    bumpDraft((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }))
    setCustomNames((prev) => {
      const next = new Map(prev)
      next.set(id, name)
      try {
        const obj = Object.fromEntries(next)
        localStorage.setItem(
          `ordering-app:custom-names:${vendorId}`,
          JSON.stringify(obj),
        )
      } catch {
        /* ignore */
      }
      return next
    })
    setNewItemName('')
    setNewItemQty('')
    setNewItemUnit('')
    setShowAddItem(false)
  }

  const handleGenerate = () => {
    if (!draft || disableOutboundActions) return
    setDraft({ ...draft, status: 'ready' })
    setLastGeneratedAt(Date.now())
  }

  const handleSaveDraft = async () => {
    if (!draft) return
    if (saving) return
    setSaving(true)
    await saveDraftToSupabase(vendorId, draft)
    setSaving(false)
    setSaveAck(true)
    if (saveResetRef.current) clearTimeout(saveResetRef.current)
    saveResetRef.current = setTimeout(() => {
      setSaveAck(false)
      saveResetRef.current = null
    }, 1500)
  }

  useEffect(() => {
    return () => {
      if (saveResetRef.current) clearTimeout(saveResetRef.current)
      if (historyHintTimerRef.current)
        clearTimeout(historyHintTimerRef.current)
    }
  }, [])

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

  const loadSuggestionHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('finalized_orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('restaurant_id', RESTAURANT_ID)
      .order('sent_at', { ascending: false })
      .limit(10)

    if (error || !data) return

    const history: VendorHistoryOrder[] = (data as FinalizedOrderRow[]).map(
      (row) => {
        const rawItems = orderItemsFromFinalizedPayload(row.items)
        return {
          date: row.delivery_date,
          deliveryDate: row.delivery_date,
          items: rawItems
            .filter((i) => i.included)
            .map((i) => ({
              itemId: i.vendorItemId,
              quantity: i.quantity,
              unitType: i.unit,
              packSizeSnapshot: undefined,
            })),
        }
      },
    )
    setSuggestionHistory(history)
  }, [vendorId])

  useEffect(() => {
    if (loadState === 'ready') void loadSuggestionHistory()
  }, [loadState, loadSuggestionHistory])

  const handleMarkSent = () => {
    if (!draft || draft.status !== 'ready' || disableOutboundActions) return
    if (!vendorRow) return
    if (!vendor || !schedulingRules) return
    const now = Date.now()
    const channel = vendorRow.order_placement_method
    const sentDraft: OrderDraft = { ...draft, status: 'sent' }
    void saveFinalizedOrderToSupabase({
      supabaseVendorId: vendorId,
      draft: sentDraft,
      messageText: previewText,
      channel,
      sentAt: now,
    })
    const snapshot: LastSentOrderSnapshot = {
      vendorId,
      sentAt: now,
      lines: draft.items.map((row) => ({
        vendorItemId: row.vendorItemId,
        included: row.included,
        quantity: row.quantity,
        unit: row.unit,
      })),
    }
    writeLastSentOrderSnapshot(snapshot)
    setDraft({
      ...sentDraft,
      items: sentDraft.items.map((row) => ({
        ...row,
        lastQuantity: row.included ? row.quantity : '',
        lastUnit: row.unit,
      })),
    })
    void loadHistory()
    void loadSuggestionHistory()
    localStorage.removeItem(draftStorageKey)
    localStorage.removeItem(draftTimestampKey)
    const blankDraft: OrderDraft = {
      vendorId,
      deliveryDate: defaultDeliveryDateForScheduling(schedulingRules),
      repFirstName: vendor.primaryRepFirstName,
      items: [],
      internalNotes: '',
      vendorNotes: '',
      status: 'draft',
    }
    void saveDraftToSupabase(vendorId, blankDraft)
    const defaultDate = defaultDeliveryDateForScheduling(
      schedulingRules,
    )
    setDraft(
      mergeDraftWithCatalog(
        null,
        catalog,
        vendorId,
        defaultDate,
        vendor.primaryRepFirstName,
      ),
    )
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
  const isPortalOrOtherPlacement =
    placementMethod === 'portal' || placementMethod === 'other'
  const showReadyPlacementBanner =
    draft.status === 'ready' && isPortalOrOtherPlacement

  const draftHasCustomItems = draft.items.some((i) =>
    i.vendorItemId.startsWith('custom:'),
  )
  const showChecklistTable = catalog.length > 0 || draftHasCustomItems
  const includedItemCount = draft.items.filter((i) => i.included).length

  const blockBuildFromHistoryByDate =
    !scheduleValidation.isValid &&
    schedulingRules.invalidDateStrategy === 'block_order'

  void blockBuildFromHistoryByDate
  void handleBuildFromHistory

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
                  <div className="min-w-0">
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
                    <DeliveryDaysHint
                      preferredDeliveryDays={
                        schedulingRules.preferredDeliveryDays
                      }
                      vendorDeliveryDays={schedulingRules.vendorDeliveryDays}
                      orderMinimum={String(vendorRow.order_minimum)}
                      cutoffTime={vendorRow.order_cutoff_time}
                      repName={vendorRow.rep_name ?? undefined}
                      orderingNotes={vendorRow.ordering_notes ?? undefined}
                    />
                  </div>
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

                {/* TODO Phase 3 — restore when suggestion engine is built
                <ChecklistDateRebuildPrompt
                  pendingRebuildDate={checklistRebuild.pendingRebuildDate}
                  onRebuild={handleBuildFromHistory}
                  onKeepCurrent={() =>
                    checklistRebuild.keepCurrentDraftForCurrentDate()
                  }
                />
                */}

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1 pb-0">
                    {/* TODO Phase 3 — restore when suggestion engine is built
                    <OrderChecklistQuickActions
                      onBuildFromHistory={handleBuildFromHistory}
                      onClearAll={clearAllItems}
                      buildFromHistoryEnabled={
                        !blockBuildFromHistoryByDate &&
                        suggestionHistory.length > 0
                      }
                      buildFromHistoryTitle={
                        suggestionHistory.length === 0
                          ? 'No order history yet.'
                          : blockBuildFromHistoryByDate
                            ? 'Pick a valid delivery day before building from history.'
                            : undefined
                      }
                    />
                    */}
                    <div
                      className="mb-3 flex flex-wrap gap-2"
                      role="toolbar"
                      aria-label="Checklist quick actions"
                    >
                      <button
                        type="button"
                        onClick={clearAllItems}
                        className="rounded border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-200 active:bg-stone-300/80"
                      >
                        Clear all
                      </button>
                    </div>
                    {historyHint ? (
                      <p className="mt-2 text-xs text-stone-500 italic">
                        {historyHint}
                      </p>
                    ) : null}
                    <SortChecklistToolbar
                      mode={checklistSortMode}
                      onChangeMode={setChecklistSortMode}
                    />

                    {!showChecklistTable ? (
                      <p className="rounded-md border border-stone-200 bg-white/80 px-4 py-6 text-center text-sm text-stone-600">
                        No catalog items yet. Import a catalog from Vendor Admin,
                        or add one-off items below.
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
                              const isCustom = row.vendorItemId.startsWith(
                                'custom:',
                              )
                              const baseName = isCustom
                                ? (customNames.get(row.vendorItemId) ??
                                  'Custom item')
                                : (cat?.name ?? row.vendorItemId)
                              const label =
                                !isCustom && cat?.packSize
                                  ? `${baseName} (${cat.packSize})`
                                  : baseName
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
                                    <span className="inline-flex flex-wrap items-center gap-x-1">
                                      <span>{label}</span>
                                      {isCustom ? (
                                        <span className="text-xs text-stone-400">
                                          (custom)
                                        </span>
                                      ) : null}
                                      {isCustom ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            bumpDraft((prev) => ({
                                              ...prev,
                                              items: prev.items.filter(
                                                (i) =>
                                                  i.vendorItemId !==
                                                  row.vendorItemId,
                                              ),
                                            }))
                                            setCustomNames((prev) => {
                                              const next = new Map(prev)
                                              next.delete(row.vendorItemId)
                                              try {
                                                localStorage.setItem(
                                                  `ordering-app:custom-names:${vendorId}`,
                                                  JSON.stringify(
                                                    Object.fromEntries(next),
                                                  ),
                                                )
                                              } catch {
                                                /* ignore */
                                              }
                                              return next
                                            })
                                          }}
                                          className="ml-1 touch-manipulation text-xs text-stone-400 hover:text-red-500"
                                          aria-label={`Remove ${label}`}
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 align-middle">
                                    <QuantityInputWithArrows
                                      value={row.quantity}
                                      onChangeValue={(q) => {
                                        const trimmed = q.trim()
                                        const numVal = parseFloat(trimmed)
                                        const isEmpty =
                                          trimmed === '' ||
                                          (Number.isFinite(numVal) && numVal <= 0)
                                        patchItem(row.vendorItemId, {
                                          quantity: q,
                                          included: isEmpty ? false : true,
                                        })
                                      }}
                                      disabled={lockChecklist}
                                      quantityLabel={label}
                                    />
                                  </td>
                                  <td className="px-2 py-2 align-middle">
                                    <input
                                      type="text"
                                      disabled={lockChecklist}
                                      className="w-full min-w-0 rounded border border-stone-300 bg-white px-1 py-1 font-mono text-xs text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60 sm:px-1.5 sm:text-sm"
                                      value={row.unit}
                                      onChange={(e) =>
                                        patchItem(row.vendorItemId, {
                                          unit: e.target.value,
                                        })
                                      }
                                      aria-label={`Unit for ${label}`}
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {showAddItem ? (
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1 basis-[140px]">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="min-h-11 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-900 sm:text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="w-16 shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Qty"
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(e.target.value)}
                            className="min-h-11 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-center text-base text-stone-900 sm:text-sm"
                          />
                        </div>
                        <div className="w-20 shrink-0">
                          <input
                            type="text"
                            placeholder="Unit"
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="min-h-11 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-base text-stone-900 sm:text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          className="min-h-11 touch-manipulation rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddItem(false)
                            setNewItemName('')
                            setNewItemQty('')
                            setNewItemUnit('')
                          }}
                          className="min-h-11 touch-manipulation text-xs text-stone-500 hover:text-stone-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddItem(true)}
                        className="mt-2 flex min-h-11 touch-manipulation items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
                      >
                        + Add item for this order
                      </button>
                    )}
                    <section
                      className="space-y-5"
                      aria-labelledby="notes-heading"
                    >
                      <h2
                        id="notes-heading"
                        className="text-sm font-semibold uppercase tracking-wide text-stone-600"
                      >
                        Notes
                      </h2>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                          Internal notes
                        </h3>
                        <p className="mt-1 text-xs text-stone-500">
                          Stays on this sheet — not included in the text to the
                          vendor.
                        </p>
                        <textarea
                          rows={3}
                          className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          value={draft.internalNotes}
                          onChange={(e) =>
                            bumpDraft((d) => ({
                              ...d,
                              internalNotes: e.target.value,
                            }))
                          }
                          placeholder="Operational reminders…"
                        />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                          Vendor notes
                        </h3>
                        <p className="mt-1 text-xs text-stone-500">
                          Appended to the generated message when non-empty.
                        </p>
                        <textarea
                          rows={3}
                          className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          value={draft.vendorNotes}
                          onChange={(e) =>
                            bumpDraft((d) => ({
                              ...d,
                              vendorNotes: e.target.value,
                            }))
                          }
                          placeholder="Anything to include in the text to the vendor…"
                        />
                      </div>
                    </section>
                  </div>

                  <div className="w-full shrink-0 space-y-3 lg:w-72">
                    {showReadyPlacementBanner ? (
                      <div
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900"
                        role="status"
                      >
                        {placementMethod === 'portal'
                          ? 'Order ready — log into vendor portal to place'
                          : 'Order ready — place using your preferred method'}
                      </div>
                    ) : null}
                    <div className="hidden lg:flex lg:flex-col lg:gap-3">
                      <OrderCartSummaryPanel
                        items={draft.items.filter(
                          (i) =>
                            i.included &&
                            i.quantity.trim() !== '' &&
                            parseFloat(i.quantity) > 0,
                        )}
                        catalog={mergedCatalog}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveDraft()}
                          disabled={saving}
                          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-40 whitespace-nowrap"
                        >
                          {saveAck ? 'Saved ✓' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (draft.status === 'draft') handleGenerate()
                            setFinalizeModalOpen(true)
                          }}
                          disabled={
                            disableOutboundActions ||
                            !hasIncludedItems ||
                            (catalog.length === 0 &&
                              !draft?.items.some((i) =>
                                i.vendorItemId.startsWith('custom:'),
                              ))
                          }
                          className="flex-1 rounded-lg bg-stone-900 py-2 text-sm font-semibold text-stone-50 disabled:opacity-40"
                        >
                          {!hasIncludedItems
                            ? 'Add items to finalize'
                            : 'Finalize Order'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <FinalizeOrderModal
                  isOpen={finalizeModalOpen}
                  onClose={() => setFinalizeModalOpen(false)}
                  vendorName={vendor.name}
                  deliveryDate={draft.deliveryDate}
                  itemCount={includedItemCount}
                  previewText={previewText}
                  placementMethod={placementMethod}
                  destination={vendorRow.destination}
                  onMarkSent={handleMarkSent}
                  status={draft.status}
                  disableActions={disableOutboundActions}
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
      {tab === 'current' ? (
        <div className="sticky bottom-0 z-10 bg-[#f7f5f0] border-t border-stone-200 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex gap-2 mt-4 lg:hidden">
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={saving}
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 disabled:opacity-40 whitespace-nowrap"
          >
            {saveAck ? 'Saved ✓' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (draft.status === 'draft') {
                handleGenerate()
              }
              setFinalizeModalOpen(true)
            }}
            disabled={
              disableOutboundActions ||
              !hasIncludedItems ||
              (catalog.length === 0 &&
                !draft?.items.some((i) =>
                  i.vendorItemId.startsWith('custom:'),
                ))
            }
            className="flex-1 rounded-lg bg-stone-900 py-3 text-sm font-semibold text-stone-50 disabled:opacity-40"
          >
            {!hasIncludedItems ? 'Add items to finalize' : 'Finalize Order'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
