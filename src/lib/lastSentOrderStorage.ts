import type {
  LastSentOrderLine,
  LastSentOrderSnapshot,
} from '../types/lastSentOrder'

export function lastSentOrderStorageKey(vendorId: string): string {
  return `ordering-app:lastSentOrder:${vendorId}`
}

export function snapshotLinesToMap(
  lines: LastSentOrderLine[],
): Map<string, LastSentOrderLine> {
  return new Map(lines.map((l) => [l.vendorItemId, l]))
}

export function readLastSentOrderSnapshot(
  vendorId: string,
): LastSentOrderSnapshot | null {
  try {
    const raw = localStorage.getItem(lastSentOrderStorageKey(vendorId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Record<string, unknown>
    if (
      typeof p.vendorId !== 'string' ||
      p.vendorId !== vendorId ||
      typeof p.sentAt !== 'number' ||
      !Array.isArray(p.lines)
    ) {
      return null
    }
    const lines: LastSentOrderLine[] = []
    for (const rawLine of p.lines) {
      if (!rawLine || typeof rawLine !== 'object') continue
      const L = rawLine as Record<string, unknown>
      if (typeof L.vendorItemId !== 'string') continue
      lines.push({
        vendorItemId: L.vendorItemId,
        included: Boolean(L.included),
        quantity: typeof L.quantity === 'string' ? L.quantity : '',
        unit: typeof L.unit === 'string' ? L.unit : '',
      })
    }
    return { vendorId: p.vendorId, sentAt: p.sentAt, lines }
  } catch {
    return null
  }
}

export function writeLastSentOrderSnapshot(snapshot: LastSentOrderSnapshot): void {
  localStorage.setItem(
    lastSentOrderStorageKey(snapshot.vendorId),
    JSON.stringify(snapshot),
  )
}
