import type { VendorRichHistoryEntry } from './types'

function keyForExcludedRows(vendorId: string): string {
  return `ordering-app:suggestionHistoryExcluded:${vendorId}`
}

/** Stable id for include/exclude controls on merged seed/app rows. */
export function suggestionHistoryRowId(row: VendorRichHistoryEntry): string {
  return `${row.source}:${row.sentAt}:${row.orderDate}:${row.deliveryDate}`
}

export function readExcludedSuggestionHistoryRowIds(
  vendorId: string,
): Set<string> {
  try {
    const raw = localStorage.getItem(keyForExcludedRows(vendorId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    const ids = parsed.filter((v): v is string => typeof v === 'string')
    return new Set(ids)
  } catch {
    return new Set()
  }
}

function writeExcludedSuggestionHistoryRowIds(
  vendorId: string,
  ids: Set<string>,
): void {
  localStorage.setItem(
    keyForExcludedRows(vendorId),
    JSON.stringify([...ids.values()]),
  )
}

export function toggleExcludedSuggestionHistoryRow(
  vendorId: string,
  rowId: string,
): void {
  const set = readExcludedSuggestionHistoryRowIds(vendorId)
  if (set.has(rowId)) set.delete(rowId)
  else set.add(rowId)
  writeExcludedSuggestionHistoryRowIds(vendorId, set)
}

