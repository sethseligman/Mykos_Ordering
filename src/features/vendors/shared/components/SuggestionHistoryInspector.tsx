import { useMemo } from 'react'
import { formatItemLine, vendorItemMessageLabel } from '../../../../lib/buildOrderMessage'
import type { VendorItem } from '../../../../types/order'
import type { VendorRichHistoryEntry } from '../vendorData/types'

export type SuggestionHistoryInspectorRow = {
  rowId: string
  excluded: boolean
  row: VendorRichHistoryEntry
}

type Props = {
  rows: SuggestionHistoryInspectorRow[]
  catalog: VendorItem[]
  expandedKey: string | null
  onToggleExpand: (key: string) => void
  onToggleInclude: (rowId: string) => void
  onDeleteMostRecentApp?: () => void
}

export function SuggestionHistoryInspector({
  rows,
  catalog,
  expandedKey,
  onToggleExpand,
  onToggleInclude,
  onDeleteMostRecentApp,
}: Props) {
  const byId = useMemo(
    () => new Map(catalog.map((c) => [c.id, c])),
    [catalog],
  )

  return (
    <div className="mt-6 rounded-md border border-stone-300 bg-white/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Suggestion history inspector
        </h3>
        {onDeleteMostRecentApp ? (
          <button
            type="button"
            onClick={onDeleteMostRecentApp}
            className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Delete latest app row
          </button>
        ) : null}
      </div>
      <p className="mb-2 text-xs text-stone-500">
        Debug view of rows that feed suggestions. Excluding is local-only.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-500">No rows.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ rowId, row, excluded }) => {
            const open = expandedKey === rowId
            return (
              <li
                key={rowId}
                className={`rounded border px-2 py-2 text-xs ${
                  excluded
                    ? 'border-stone-300 bg-stone-100/80 text-stone-500'
                    : 'border-stone-300 bg-white text-stone-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(rowId)}
                    className="text-left"
                    aria-expanded={open}
                  >
                    <span className="font-medium">{row.orderDate}</span>{' '}
                    <span className="text-stone-500">({row.source})</span>{' '}
                    <span className="text-stone-500">· {row.items.length} lines</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleInclude(rowId)}
                    className="rounded border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium hover:bg-stone-100"
                  >
                    {excluded ? 'Include' : 'Exclude'}
                  </button>
                </div>
                {open ? (
                  row.items.length > 0 ? (
                    <ul className="mt-2 border-t border-stone-200 pt-2">
                      {row.items.map((it, i) => {
                        const cat = byId.get(it.itemId)
                        const label = cat ? vendorItemMessageLabel(cat) : it.itemId
                        return (
                          <li key={`${rowId}-${i}`} className="font-mono text-[12px]">
                            {formatItemLine(it.quantity, it.unitType, label)}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] italic text-stone-500">
                      No line items stored.
                    </p>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

