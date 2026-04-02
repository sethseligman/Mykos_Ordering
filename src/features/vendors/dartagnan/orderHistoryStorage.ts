import type { LastSentOrderSnapshot } from '../../../types/lastSentOrder'
import type { OrderDraft, VendorItem } from '../../../types/order'
import type { OrderHistoryEntry } from '../../../types/orderHistory'
import {
  readExcludedSuggestionHistoryRowIds,
  suggestionHistoryRowId,
  toggleExcludedSuggestionHistoryRow,
} from '../shared/vendorData/suggestionHistoryControls'
import {
  previewFromVendorHistoryLines,
  snapshotToOrderedHistoryLines,
} from '../shared/vendorData/vendorHistoryDisplay'
import type {
  VendorHistoryOrder,
  VendorRichHistoryEntry,
} from '../shared/vendorData/types'
import { dartagnanOrderHistory } from './dartagnanSeedHistory'

const RICH_HISTORY_KEY = 'ordering-app:orderHistoryRich:dartagnan'
/** Pre–rich-storage compact rows (preview only). */
const LEGACY_HISTORY_KEY = 'ordering-app:orderHistory:dartagnan'
const MAX_ENTRIES = 30
const VENDOR_ID = 'dartagnan'

function seedRichEntries(catalog: VendorItem[]): VendorRichHistoryEntry[] {
  return dartagnanOrderHistory.map((o) => ({
    sentAt: new Date(`${o.date}T12:00:00`).getTime(),
    orderDate: o.date,
    deliveryDate: o.deliveryDate,
    items: o.items,
    preview: previewFromVendorHistoryLines(o.items, catalog),
    source: 'seed' as const,
  }))
}

function readRawAppRich(): VendorRichHistoryEntry[] {
  try {
    const raw = localStorage.getItem(RICH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: VendorRichHistoryEntry[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.sentAt !== 'number') continue
      if (!Array.isArray(r.items)) continue
      out.push({
        sentAt: r.sentAt,
        orderDate: typeof r.orderDate === 'string' ? r.orderDate : '',
        deliveryDate:
          typeof r.deliveryDate === 'string' ? r.deliveryDate : '',
        items: r.items as VendorRichHistoryEntry['items'],
        preview: typeof r.preview === 'string' ? r.preview : '',
        source: 'app',
      })
    }
    return out
  } catch {
    return []
  }
}

/** Legacy compact entries → rich shape with empty `items` (expand shows preview note). */
function readLegacyCompact(): VendorRichHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: VendorRichHistoryEntry[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.sentAt !== 'number') continue
      const orderDate = new Date(r.sentAt as number).toISOString().slice(0, 10)
      out.push({
        sentAt: r.sentAt as number,
        orderDate,
        deliveryDate:
          typeof r.deliveryDate === 'string' ? r.deliveryDate : '',
        items: [],
        preview: typeof r.preview === 'string' ? r.preview : '—',
        source: 'app',
      })
    }
    return out
  } catch {
    return []
  }
}

function mergeAppRows(): VendorRichHistoryEntry[] {
  const rich = readRawAppRich()
  const legacy = readLegacyCompact()
  const seen = new Set(rich.map((e) => e.sentAt))
  const merged = [...rich]
  for (const e of legacy) {
    if (!seen.has(e.sentAt)) merged.push(e)
  }
  return merged
}

/** @deprecated Use `readDartagnanDisplayedHistory`; kept for callers that need compact shape. */
export function readDartagnanOrderHistory(): OrderHistoryEntry[] {
  return mergeAppRows().map((e) => ({
    sentAt: e.sentAt,
    deliveryDate: e.deliveryDate,
    lineCount: e.items.length || 0,
    preview: e.preview,
  }))
}

export function readDartagnanDisplayedHistory(
  catalog: VendorItem[],
): VendorRichHistoryEntry[] {
  const app = mergeAppRows()
  const seed = seedRichEntries(catalog)
  return [...app, ...seed].sort((a, b) => b.sentAt - a.sentAt)
}

/** Source used by suggestion engine: app-finalized + seed, newest first. */
export function readDartagnanSuggestionHistory(
  _catalog: VendorItem[],
): VendorHistoryOrder[] {
  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const app = mergeAppRows()
    .filter((e) => !excluded.has(suggestionHistoryRowId(e)))
    .filter((e) => e.items.length > 0)
    .sort((a, b) => b.sentAt - a.sentAt)
  const seed = seedRichEntries(_catalog).filter(
    (e) => !excluded.has(suggestionHistoryRowId(e)),
  )
  const seedAsOrders = seed.map((e) => ({
    date: e.orderDate,
    deliveryDate: e.deliveryDate,
    items: e.items,
  }))
  const appAsOrders = app.map((e) => ({
    date: e.orderDate,
    deliveryDate: e.deliveryDate,
    items: e.items,
  }))
  return [...appAsOrders, ...seedAsOrders].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
}

export function readDartagnanSuggestionInspectorRows(
  catalog: VendorItem[],
): Array<{ rowId: string; excluded: boolean; row: VendorRichHistoryEntry }> {
  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const app = mergeAppRows()
  const seed = seedRichEntries(catalog)
  return [...app, ...seed]
    .sort((a, b) => b.sentAt - a.sentAt)
    .map((row) => {
      const rowId = suggestionHistoryRowId(row)
      return { rowId, excluded: excluded.has(rowId), row }
    })
}

export function toggleDartagnanSuggestionRowExcluded(rowId: string): void {
  toggleExcludedSuggestionHistoryRow(VENDOR_ID, rowId)
}

export function deleteMostRecentDartagnanAppSuggestionRow(): void {
  const app = readRawAppRich().sort((a, b) => b.sentAt - a.sentAt)
  if (app.length === 0) return
  const [latest, ...rest] = app
  localStorage.setItem(RICH_HISTORY_KEY, JSON.stringify(rest))

  // If the deleted row had been excluded earlier, remove stale exclusion id.
  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const latestId = suggestionHistoryRowId(latest)
  if (excluded.delete(latestId)) {
    localStorage.setItem(
      `ordering-app:suggestionHistoryExcluded:${VENDOR_ID}`,
      JSON.stringify([...excluded.values()]),
    )
  }
}

export function appendDartagnanOrderHistory(
  draft: OrderDraft,
  snapshot: LastSentOrderSnapshot,
  catalog: VendorItem[],
): void {
  const items = snapshotToOrderedHistoryLines(snapshot, catalog)
  const orderDate = new Date(snapshot.sentAt).toISOString().slice(0, 10)
  const entry: VendorRichHistoryEntry = {
    sentAt: snapshot.sentAt,
    orderDate,
    deliveryDate: draft.deliveryDate,
    items,
    preview: previewFromVendorHistoryLines(items, catalog),
    source: 'app',
  }
  const next = [entry, ...readRawAppRich()].slice(0, MAX_ENTRIES)
  localStorage.setItem(RICH_HISTORY_KEY, JSON.stringify(next))
}
