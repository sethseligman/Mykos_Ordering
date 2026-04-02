import type { OrderChecklistSortMode } from '../orderChecklistSort'

type Props = {
  mode: OrderChecklistSortMode
  onChangeMode: (mode: OrderChecklistSortMode) => void
}

export function SortChecklistToolbar({ mode, onChangeMode }: Props) {
  const seg = (m: OrderChecklistSortMode, label: string, title: string) => (
    <button
      type="button"
      onClick={() => onChangeMode(m)}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        mode === m
          ? 'bg-stone-800 text-stone-50'
          : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">
        Sort
      </span>
      <div
        className="inline-flex rounded-md border border-stone-300 bg-white p-0.5 shadow-sm"
        role="group"
        aria-label="Sort product list"
      >
        {seg('alphabetical', 'A–Z', 'Alphabetical by product name')}
        {seg('frequency', 'Often', 'Most often in recent orders')}
      </div>
    </div>
  )
}
