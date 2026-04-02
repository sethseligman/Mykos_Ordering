import type { LastSentOrderSnapshot } from '../../../types/lastSentOrder'
import type { OrderDraft, VendorItem } from '../../../types/order'
import { optimaSeedHistory } from './optimaSeedHistory'
import { mergeSuggestionHistory } from '../shared/vendorData/readSuggestionHistory'
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

const HISTORY_KEY = 'ordering-app:orderHistoryRich:optima'
const MAX_ENTRIES = 30
const VENDOR_ID = 'optima'

export type OptimaRichHistoryEntry = VendorRichHistoryEntry

function seedRichEntries(catalog: VendorItem[]): VendorRichHistoryEntry[] {
  return optimaSeedHistory.map((o) => ({
    sentAt: new Date(`${o.date}T12:00:00`).getTime(),
    orderDate: o.date,
    deliveryDate: o.deliveryDate,
    items: o.items,
    preview: previewFromVendorHistoryLines(o.items, catalog),
    source: 'seed' as const,
  }))
}

function readRawApp(): VendorRichHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
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

export function readOptimaDisplayedHistory(
  catalog: VendorItem[],
): VendorRichHistoryEntry[] {
  const app = readRawApp()
  const seed = seedRichEntries(catalog)
  return [...app, ...seed].sort((a, b) => b.sentAt - a.sentAt)
}

/** Source used by suggestion engine: app-finalized + seed, newest first. */
export function readOptimaSuggestionHistory(
  catalog: VendorItem[],
): VendorHistoryOrder[] {
  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const app = readRawApp()
    .filter((e) => !excluded.has(suggestionHistoryRowId(e)))
    .sort((a, b) => b.sentAt - a.sentAt)
  const seed = seedRichEntries(catalog).filter(
    (e) => !excluded.has(suggestionHistoryRowId(e)),
  )
  const seedAsOrders = seed.map((e) => ({
    date: e.orderDate,
    deliveryDate: e.deliveryDate,
    items: e.items,
  }))
  return mergeSuggestionHistory(seedAsOrders, app)
}

export function readOptimaSuggestionInspectorRows(
  catalog: VendorItem[],
): Array<{ rowId: string; excluded: boolean; row: VendorRichHistoryEntry }> {
  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const app = readRawApp()
  const seed = seedRichEntries(catalog)
  return [...app, ...seed]
    .sort((a, b) => b.sentAt - a.sentAt)
    .map((row) => {
      const rowId = suggestionHistoryRowId(row)
      return { rowId, excluded: excluded.has(rowId), row }
    })
}

export function toggleOptimaSuggestionRowExcluded(rowId: string): void {
  toggleExcludedSuggestionHistoryRow(VENDOR_ID, rowId)
}

export function deleteMostRecentOptimaAppSuggestionRow(): void {
  const app = readRawApp().sort((a, b) => b.sentAt - a.sentAt)
  if (app.length === 0) return
  const [latest, ...rest] = app
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rest))

  const excluded = readExcludedSuggestionHistoryRowIds(VENDOR_ID)
  const latestId = suggestionHistoryRowId(latest)
  if (excluded.delete(latestId)) {
    localStorage.setItem(
      `ordering-app:suggestionHistoryExcluded:${VENDOR_ID}`,
      JSON.stringify([...excluded.values()]),
    )
  }
}

export function appendOptimaRichHistory(
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
  const next = [entry, ...readRawApp()].slice(0, MAX_ENTRIES)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}
