import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  dartagnanRepFirstNameOptions,
  dartagnanVendor,
  dartagnanVendorItems,
  initialDartagnanDraft,
} from './dartagnan.mock'
import { buildEmptyTemplate } from './dartagnanItemTemplates'
import {
  appendDartagnanOrderHistory,
  readDartagnanSuggestionHistory,
} from './orderHistoryStorage'
import { dartagnanSchedulingRules } from './dartagnanSchedulingRules'
import {
  dartagnanPlatformConfig,
  dartagnanStandingOrderHint,
} from './dartagnanVendorConfig'
import { buildOrderMessage } from '../../../lib/buildOrderMessage'
import { ChecklistDateRebuildPrompt } from '../shared/components/ChecklistDateRebuildPrompt'
import { OrderChecklistQuickActions } from '../shared/components/OrderChecklistQuickActions'
import { FinalizeOrderModal } from '../shared/components/FinalizeOrderModal'
import { OrderCartSummaryPanel } from '../shared/components/OrderCartSummaryPanel'
import { VendorDeliveryDateBanner } from '../shared/components/VendorDeliveryDateBanner'
import { QuantityInputWithArrows } from '../shared/components/QuantityInputWithArrows'
import { SortChecklistToolbar } from '../shared/components/SortChecklistToolbar'
import {
  orderedCatalogIdsForChecklist,
  sortOrderItemsByCatalogOrder,
  type OrderChecklistSortMode,
} from '../shared/orderChecklistSort'
import {
  applyStandingOrderRulesToItems,
  useChecklistDateRebuildPrompt,
  validateVendorDeliveryDate,
} from '../shared/vendorScheduling'
import {
  loadDraftWithTimestampFromSupabase,
  saveDraftToSupabase,
} from '../shared/draftQueries'
import {
  saveExecutionEventToSupabase,
  saveFinalizedOrderToSupabase,
} from '../shared/finalizedOrderQueries'
import { resolveVendorPlatformConfig } from '../shared/vendorSettingsStorage'
import {
  appendVendorExecutionEvent,
  formatExecutionEventDisplay,
  readMostRecentVendorExecutionEvent,
} from '../shared/vendorData/orderExecutionLog'
import { generateSuggestedOrderItemsFromHistory } from '../shared/vendorData/suggestOrderFromHistory'
import { dartagnanOrderHistory } from './dartagnanSeedHistory'
import {
  readLastSentOrderSnapshot,
  writeLastSentOrderSnapshot,
} from '../../../lib/lastSentOrderStorage'
import { applyLastSentBaselineToOrderItems } from '../../../lib/orderItemBaseline'
import type { LastSentOrderSnapshot } from '../../../types/lastSentOrder'
import type {
  OrderChannel,
  OrderDraft,
  OrderItem,
  OrderStatus,
  VendorItem,
} from '../../../types/order'
type Props = {
  /** Strip outer card chrome when nested in vendor workspace */
  embedded?: boolean
  /** After mark sent; parent can refresh read-only tabs */
  onSent?: () => void
}

const statusStyles: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className:
      'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  },
  ready: {
    label: 'Ready',
    className:
      'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  },
  sent: {
    label: 'Sent',
    className:
      'bg-stone-200 text-stone-800 ring-1 ring-stone-300/80',
  },
}

const draftStorageKey = `ordering-app:draft:${dartagnanVendor.id}`
const draftTimestampKey = `ordering-app:draft-ts:${dartagnanVendor.id}`
const generatedAtStorageKey = `ordering-app:lastGeneratedAt:${dartagnanVendor.id}`
const sentAtStorageKey = `ordering-app:lastSentAt:${dartagnanVendor.id}`

// Supabase vendor ID for D'Artagnan
const SUPABASE_VENDOR_ID = 'b17c6753-772d-464a-8fc4-b821a34a3dbd'

const DARTAGNAN_REP_SET = new Set<string>(dartagnanRepFirstNameOptions)

const CHANNEL_DISPLAY: Record<OrderChannel, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  portal: 'Portal',
  other: 'Other',
}

function finalizeDraftWithBaseline(draft: OrderDraft): OrderDraft {
  const snap = readLastSentOrderSnapshot(dartagnanVendor.id)
  return {
    ...draft,
    items: applyLastSentBaselineToOrderItems(
      draft.items,
      dartagnanVendorItems,
      snap,
    ),
  }
}

function readStoredDraft(): OrderDraft {
  try {
    const raw = localStorage.getItem(draftStorageKey)
    if (!raw) return finalizeDraftWithBaseline(initialDartagnanDraft)
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.items) ||
      typeof parsed.status !== 'string'
    ) {
      return finalizeDraftWithBaseline(initialDartagnanDraft)
    }

    let internalNotes: string
    if (typeof parsed.internalNotes === 'string') {
      internalNotes = parsed.internalNotes
    } else if (typeof parsed.notes === 'string') {
      internalNotes = parsed.notes
    } else {
      internalNotes = initialDartagnanDraft.internalNotes
    }

    const vendorNotes =
      typeof parsed.vendorNotes === 'string' ? parsed.vendorNotes : ''

    const deliveryDate =
      typeof parsed.deliveryDate === 'string'
        ? parsed.deliveryDate
        : initialDartagnanDraft.deliveryDate

    let repFirstName =
      typeof parsed.repFirstName === 'string'
        ? parsed.repFirstName.trim()
        : ''
    if (!repFirstName || !DARTAGNAN_REP_SET.has(repFirstName)) {
      repFirstName = initialDartagnanDraft.repFirstName
    }

    if (!localStorage.getItem(draftTimestampKey)) {
      localStorage.setItem(draftTimestampKey, Date.now().toString())
    }

    return finalizeDraftWithBaseline({
      vendorId:
        typeof parsed.vendorId === 'string'
          ? parsed.vendorId
          : initialDartagnanDraft.vendorId,
      deliveryDate,
      repFirstName,
      items: parsed.items as OrderItem[],
      internalNotes,
      vendorNotes,
      status: parsed.status as OrderStatus,
    })
  } catch {
    return finalizeDraftWithBaseline(initialDartagnanDraft)
  }
}

function readStoredLastGeneratedAt(): number | null {
  try {
    const raw = localStorage.getItem(generatedAtStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as number | null
    return typeof parsed === 'number' ? parsed : null
  } catch {
    return null
  }
}

function readStoredSentAt(): number | null {
  try {
    const raw = localStorage.getItem(sentAtStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as number | null
    return typeof parsed === 'number' ? parsed : null
  } catch {
    return null
  }
}

function catalogById(items: VendorItem[]) {
  return new Map(items.map((i) => [i.id, i]))
}

type ChecklistProps = {
  items: OrderItem[]
  catalog: VendorItem[]
  onChange: (next: OrderItem[]) => void
  disabled: boolean
}

function OrderChecklist({ items, catalog, onChange, disabled }: ChecklistProps) {
  const map = useMemo(() => catalogById(catalog), [catalog])

  const patch = (
    vendorItemId: string,
    patch: Partial<OrderItem>,
    autoInclude = false,
  ) => {
    onChange(
      items.map((row) =>
        row.vendorItemId === vendorItemId
          ? {
              ...row,
              ...patch,
              included: autoInclude ? true : (patch.included ?? row.included),
            }
          : row,
      ),
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-stone-300 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <table className="w-full min-w-0 table-fixed border-collapse text-left text-xs sm:text-sm">
        <colgroup>
          <col className="w-8 sm:w-9" />
          <col />
          <col className="w-[4.125rem] sm:w-[5.25rem]" />
          <col className="w-11 sm:w-16" />
        </colgroup>
        <thead>
          <tr className="border-b border-stone-200 bg-stone-100/90 text-[10px] font-semibold uppercase tracking-wide text-stone-600 sm:text-xs">
            <th className="px-1 py-2 sm:px-2" scope="col">
              <span className="sr-only">Include</span>
            </th>
            <th className="px-1 py-2 sm:px-2" scope="col">
              Item
            </th>
            <th className="px-0.5 py-2 text-center sm:px-1" scope="col">
              Qty
            </th>
            <th className="px-0.5 py-2 sm:px-1" scope="col">
              Unit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {items.map((row) => {
            const meta = map.get(row.vendorItemId)
            if (!meta) return null
            return (
              <tr
                key={row.vendorItemId}
                className={
                  row.included
                    ? 'bg-white'
                    : 'bg-stone-50/60 text-stone-500'
                }
              >
                <td className="px-1 py-1.5 align-middle sm:px-2 sm:py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-400 text-stone-800 focus:ring-stone-500"
                    checked={row.included}
                    disabled={disabled}
                    onChange={(e) =>
                      patch(row.vendorItemId, { included: e.target.checked })
                    }
                    aria-label={`Include ${meta.name}`}
                  />
                </td>
                <td
                  className="max-w-0 w-full truncate px-1 py-1.5 align-middle font-medium text-stone-900 sm:px-2 sm:py-2"
                  title={meta.name}
                >
                  {meta.name}
                </td>
                <td className="shrink-0 whitespace-nowrap px-0.5 py-1.5 align-middle sm:px-1 sm:py-2">
                  <QuantityInputWithArrows
                    value={row.quantity}
                    onChangeValue={(quantity) =>
                      patch(row.vendorItemId, { quantity }, true)
                    }
                    disabled={disabled}
                    quantityLabel={meta.name}
                  />
                </td>
                <td className="shrink-0 whitespace-nowrap px-0.5 py-1.5 align-middle sm:px-1 sm:py-2">
                  <input
                    type="text"
                    disabled={disabled}
                    className="w-full min-w-0 rounded border border-stone-300 bg-white px-1 py-1 font-mono text-xs text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60 sm:px-1.5 sm:text-sm"
                    value={row.unit}
                    onChange={(e) =>
                      patch(row.vendorItemId, { unit: e.target.value }, true)
                    }
                    aria-label={`Unit for ${meta.name}`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type OrderMetadataBarProps = {
  deliveryDate: string
  repFirstName: string
  channel: OrderChannel
  status: OrderStatus
  statusUi: { label: string; className: string }
  lastGeneratedAt: number | null
  sentAt: number | null
  onDeliveryDateChange: (value: string) => void
  onRepFirstNameChange: (value: string) => void
}

function OrderMetadataBar({
  deliveryDate,
  repFirstName,
  channel,
  status,
  statusUi,
  lastGeneratedAt,
  sentAt,
  onDeliveryDateChange,
  onRepFirstNameChange,
}: OrderMetadataBarProps) {
  return (
    <div
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-stone-200 bg-[#f2efe8] px-4 py-2.5"
      aria-label="Order record"
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex min-w-[9.5rem] flex-col gap-0.5">
          <label
            htmlFor="order-delivery-date"
            className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
          >
            Delivery date
          </label>
          <input
            id="order-delivery-date"
            type="date"
            value={deliveryDate}
            onChange={(e) => onDeliveryDateChange(e.target.value)}
            className="rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
        <div className="flex min-w-[7.5rem] flex-col gap-0.5">
          <label
            htmlFor="order-rep"
            className="text-[10px] font-semibold uppercase tracking-wide text-stone-500"
          >
            Rep
          </label>
          <select
            id="order-rep"
            value={repFirstName}
            onChange={(e) => onRepFirstNameChange(e.target.value)}
            className="rounded border border-stone-300 bg-white px-2 py-1 text-sm font-medium text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
          >
            {dartagnanRepFirstNameOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5 pb-px">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Channel
          </span>
          <span className="text-sm font-medium text-stone-800">
            {CHANNEL_DISPLAY[channel]}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusUi.className}`}
        >
          {statusUi.label}
        </span>
        {lastGeneratedAt != null &&
          (status === 'ready' || status === 'sent') && (
            <span className="text-xs text-stone-500">
              Generated{' '}
              {new Date(lastGeneratedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        {status === 'sent' && sentAt != null && (
          <span className="text-xs text-stone-500">
            Sent at{' '}
            {new Date(sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  )
}

export function DartagnanOrderSheet({ embedded, onSent }: Props) {
  const [draft, setDraft] = useState<OrderDraft>(() => readStoredDraft())
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(() =>
    readStoredLastGeneratedAt(),
  )
  const [sentAt, setSentAt] = useState<number | null>(() => readStoredSentAt())
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveAck, setSaveAck] = useState(false)
  const saveResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [latestExecutionLabel, setLatestExecutionLabel] = useState<string | null>(() => {
    const event = readMostRecentVendorExecutionEvent(dartagnanVendor.id)
    return event ? formatExecutionEventDisplay(event) : null
  })
  const [checklistSortMode, setChecklistSortMode] =
    useState<OrderChecklistSortMode>('frequency')

  const scheduleValidation = useMemo(
    () =>
      validateVendorDeliveryDate(
        dartagnanSchedulingRules,
        draft.deliveryDate,
      ),
    [draft.deliveryDate],
  )

  const disableOutboundActions =
    !scheduleValidation.isValid &&
    dartagnanSchedulingRules.invalidDateStrategy !== 'allow_blank_order'

  const hasIncludedItems = draft.items.some(
    (i) => i.included && i.quantity.trim() !== '',
  )

  const lockChecklist =
    !scheduleValidation.isValid &&
    dartagnanSchedulingRules.invalidDateStrategy === 'block_order'

  const checklistRebuild = useChecklistDateRebuildPrompt({
    deliveryDate: draft.deliveryDate,
    isDeliveryDateValid: scheduleValidation.isValid,
  })

  const checklistOrderedIds = useMemo(
    () =>
      orderedCatalogIdsForChecklist(
        dartagnanVendorItems,
        dartagnanOrderHistory,
        checklistSortMode,
      ),
    [checklistSortMode],
  )

  const checklistDisplayItems = useMemo(
    () => sortOrderItemsByCatalogOrder(draft.items, checklistOrderedIds),
    [draft.items, checklistOrderedIds],
  )

  const previewText = useMemo(
    () => buildOrderMessage(dartagnanVendor, dartagnanVendorItems, draft),
    [draft],
  )

  const bumpDraftOnEdit = useCallback(
    (updater: (prev: OrderDraft) => OrderDraft) => {
      setLastGeneratedAt(null)
      setSentAt(null)
      setDraft((prev) => {
        const next = updater(prev)
        if (prev.status === 'ready' || prev.status === 'sent') {
          return { ...next, status: 'draft' }
        }
        return next
      })
    },
    [],
  )

  const setItems = (items: OrderItem[]) => {
    bumpDraftOnEdit((d) => ({ ...d, items }))
  }

  const setInternalNotes = (internalNotes: string) => {
    bumpDraftOnEdit((d) => ({ ...d, internalNotes }))
  }

  const setVendorNotes = (vendorNotes: string) => {
    bumpDraftOnEdit((d) => ({ ...d, vendorNotes }))
  }

  const setDeliveryDate = (deliveryDate: string) => {
    bumpDraftOnEdit((d) => ({ ...d, deliveryDate }))
  }

  const setRepFirstName = (repFirstName: string) => {
    bumpDraftOnEdit((d) => ({ ...d, repFirstName }))
  }

  const loadFromHistory = () => {
    const v = validateVendorDeliveryDate(
      dartagnanSchedulingRules,
      draft.deliveryDate,
    )
    if (!v.applyHistorySuggestions) return
    const suggestionHistory = readDartagnanSuggestionHistory(
      dartagnanVendorItems,
    )

    bumpDraftOnEdit((d) => {
      let items = generateSuggestedOrderItemsFromHistory(
        suggestionHistory,
        dartagnanVendorItems,
      )
      if (v.applyStandingOrders && v.weekday) {
        items = applyStandingOrderRulesToItems(
          items,
          v.weekday,
          dartagnanSchedulingRules,
        )
      }
      return { ...d, items }
    })
    checklistRebuild.markChecklistRebuiltForCurrentDate()
  }

  const clearAllItems = () => {
    bumpDraftOnEdit((d) => ({
      ...d,
      items: buildEmptyTemplate(dartagnanVendorItems, d.items),
    }))
  }

  const handleGenerate = () => {
    if (disableOutboundActions) return
    setDraft((d) => ({ ...d, status: 'ready' }))
    setLastGeneratedAt(Date.now())
  }

  const handleSaveDraft = async () => {
    if (saving) return
    setSaving(true)
    await saveDraftToSupabase(SUPABASE_VENDOR_ID, draft)
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
    }
  }, [])

  const logNativeSendExecution = () => {
    const method = resolveVendorPlatformConfig(dartagnanPlatformConfig).settings
      .orderPlacement.method
    appendVendorExecutionEvent({
      vendorId: dartagnanVendor.id,
      placedAt: Date.now(),
      deliveryDate: draft.deliveryDate,
      method,
      lineCount: draft.items.filter((i) => i.included).length,
    })
    void saveExecutionEventToSupabase({
      supabaseVendorId: SUPABASE_VENDOR_ID,
      channel:
        method === 'sms' ||
        method === 'email' ||
        method === 'portal' ||
        method === 'other'
          ? method
          : 'sms',
      destination: resolveVendorPlatformConfig(dartagnanPlatformConfig).settings
        .orderPlacement.destination,
      status: 'sent',
      sentAt: Date.now(),
    })
    const event = readMostRecentVendorExecutionEvent(dartagnanVendor.id)
    setLatestExecutionLabel(event ? formatExecutionEventDisplay(event) : null)
  }

  const handleMarkSent = () => {
    if (draft.status !== 'ready' || disableOutboundActions) return
    const now = Date.now()
    const snapshot: LastSentOrderSnapshot = {
      vendorId: dartagnanVendor.id,
      sentAt: now,
      lines: draft.items.map((row) => ({
        vendorItemId: row.vendorItemId,
        included: row.included,
        quantity: row.quantity,
        unit: row.unit,
      })),
    }
    writeLastSentOrderSnapshot(snapshot)
    appendDartagnanOrderHistory(draft, snapshot, dartagnanVendorItems)
    // Mirror finalized order to Supabase — fire and forget
    void saveFinalizedOrderToSupabase({
      supabaseVendorId: SUPABASE_VENDOR_ID,
      draft,
      messageText: previewText,
      channel: (() => {
        const m = resolveVendorPlatformConfig(dartagnanPlatformConfig).settings
          .orderPlacement.method
        return m === 'sms' ||
          m === 'email' ||
          m === 'portal' ||
          m === 'other'
          ? m
          : 'sms'
      })(),
      sentAt: now,
    })
    setDraft((d) => ({
      ...d,
      status: 'sent',
      items: d.items.map((row) => ({
        ...row,
        lastQuantity: row.included ? row.quantity : '',
        lastUnit: row.unit,
      })),
    }))
    setSentAt(now)
    onSent?.()
  }

  const status = draft.status
  const statusUi = statusStyles[status]

  useEffect(() => {
    void loadDraftWithTimestampFromSupabase(SUPABASE_VENDOR_ID).then(
      (remote) => {
        if (!remote) return

        const localTsRaw = localStorage.getItem(draftTimestampKey)
        const localTs = localTsRaw ? parseInt(localTsRaw, 10) : 0
        const remoteTs = new Date(remote.updatedAt).getTime()

        if (remoteTs > localTs) {
          const hydrated = finalizeDraftWithBaseline(remote.draft)
          setDraft(hydrated)
          localStorage.setItem(draftStorageKey, JSON.stringify(hydrated))
          localStorage.setItem(draftTimestampKey, remoteTs.toString())
        }
      },
    )
  }, [])

  useEffect(() => {
    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
    localStorage.setItem(draftTimestampKey, Date.now().toString())
  }, [draft])

  // Mirror draft to Supabase on every change — fire and forget
  useEffect(() => {
    void saveDraftToSupabase(SUPABASE_VENDOR_ID, draft)
  }, [draft])

  useEffect(() => {
    localStorage.setItem(
      generatedAtStorageKey,
      JSON.stringify(lastGeneratedAt),
    )
  }, [lastGeneratedAt])

  useEffect(() => {
    localStorage.setItem(sentAtStorageKey, JSON.stringify(sentAt))
  }, [sentAt])

  const shellClass = embedded
    ? 'font-sans text-stone-800'
    : 'overflow-hidden rounded-lg border border-stone-400/90 bg-[#f7f5f0] font-sans text-stone-800 shadow-[0_2px_0_rgba(28,25,23,0.06),0_12px_32px_-8px_rgba(28,25,23,0.12)]'

  const dartPlacement = resolveVendorPlatformConfig(dartagnanPlatformConfig)
    .settings.orderPlacement
  const includedItemCount = draft.items.filter((i) => i.included).length

  return (
    <div className={shellClass}>
          <OrderMetadataBar
            deliveryDate={draft.deliveryDate}
            repFirstName={draft.repFirstName}
            channel={dartagnanVendor.channel}
            status={status}
            statusUi={statusUi}
            lastGeneratedAt={lastGeneratedAt}
            sentAt={sentAt}
            onDeliveryDateChange={setDeliveryDate}
            onRepFirstNameChange={setRepFirstName}
          />

          <VendorDeliveryDateBanner
            validation={scheduleValidation}
            invalidDateStrategy={dartagnanSchedulingRules.invalidDateStrategy}
            onUseSuggestedDate={(iso) => setDeliveryDate(iso)}
          />
          {latestExecutionLabel ? (
            <div className="px-4 pt-2 text-xs text-stone-600 sm:px-6">
              {latestExecutionLabel}
            </div>
          ) : null}

          <div className="grid gap-8 p-4 sm:p-6 lg:grid-cols-[1fr_minmax(16rem,20rem)] lg:items-start">
            <div className="space-y-6 pb-24 lg:pb-0">
              <section aria-labelledby="checklist-heading">
                <h2
                  id="checklist-heading"
                  className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-600"
                >
                  Order checklist
                </h2>
                <OrderChecklistQuickActions
                  onApplyFromHistory={loadFromHistory}
                  onClearAll={clearAllItems}
                  hint={
                    scheduleValidation.applyStandingOrders
                      ? dartagnanStandingOrderHint
                      : undefined
                  }
                  applyFromHistoryEnabled={
                    scheduleValidation.applyHistorySuggestions
                  }
                  applyFromHistoryTitle={
                    scheduleValidation.applyHistorySuggestions
                      ? undefined
                      : 'Pick a valid delivery day before applying history.'
                  }
                />
                <ChecklistDateRebuildPrompt
                  pendingRebuildDate={checklistRebuild.pendingRebuildDate}
                  onRebuild={loadFromHistory}
                  onKeepCurrent={
                    checklistRebuild.keepCurrentDraftForCurrentDate
                  }
                />
                <SortChecklistToolbar
                  mode={checklistSortMode}
                  onChangeMode={setChecklistSortMode}
                />
                <OrderChecklist
                  items={checklistDisplayItems}
                  catalog={dartagnanVendorItems}
                  onChange={setItems}
                  disabled={lockChecklist}
                />
              </section>

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
                    Stays on this sheet — not included in the text to the vendor.
                  </p>
                  <textarea
                    id="internal-notes"
                    rows={3}
                    className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    value={draft.internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
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
                    id="vendor-notes"
                    rows={3}
                    className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400"
                    value={draft.vendorNotes}
                    onChange={(e) => setVendorNotes(e.target.value)}
                    placeholder="Anything to include in the text to the vendor…"
                  />
                </div>
              </section>
            </div>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
              <div className="hidden lg:block">
                <OrderCartSummaryPanel
                  items={draft.items}
                  catalog={dartagnanVendorItems}
                />
              </div>
            </aside>
          </div>
          <FinalizeOrderModal
            isOpen={finalizeModalOpen}
            onClose={() => setFinalizeModalOpen(false)}
            vendorName={dartagnanVendor.name}
            deliveryDate={draft.deliveryDate}
            itemCount={includedItemCount}
            previewText={previewText}
            placementMethod={dartPlacement.method}
            destination={dartPlacement.destination}
            onMarkSent={handleMarkSent}
            status={draft.status}
            onNativeSendWillOpen={logNativeSendExecution}
            disableActions={disableOutboundActions}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#f7f5f0] border-t border-stone-200 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 flex gap-2 lg:static lg:z-auto lg:border-t-0 lg:bg-transparent lg:px-0 lg:pt-4 lg:pb-0">
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
              disabled={disableOutboundActions || !hasIncludedItems}
              className="flex-1 rounded-lg bg-stone-900 py-3 text-sm font-semibold text-stone-50 disabled:opacity-40"
            >
              {!hasIncludedItems ? 'Add items to finalize' : 'Finalize Order'}
            </button>
          </div>
    </div>
  )
}
