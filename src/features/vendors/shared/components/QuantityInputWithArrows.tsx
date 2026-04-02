/** Step qty for whole numbers; empty when decremented below 1. */
export function stepQuantityString(current: string, delta: number): string {
  const t = current.trim()
  const n = parseFloat(t)
  if (!Number.isFinite(n)) {
    if (delta > 0) return '1'
    return ''
  }
  const next = n + delta
  if (next <= 0) return ''
  if (Number.isInteger(n) && Number.isInteger(delta)) {
    return String(Math.trunc(next))
  }
  return String(next)
}

type Props = {
  value: string
  onChangeValue: (next: string) => void
  disabled?: boolean
  /** e.g. item name for aria-label */
  quantityLabel: string
}

export function QuantityInputWithArrows({
  value,
  onChangeValue,
  disabled = false,
  quantityLabel,
}: Props) {
  return (
    <div className="flex w-full items-center justify-end gap-px">
      <input
        type="text"
        inputMode="decimal"
        placeholder="—"
        disabled={disabled}
        className="w-10 min-w-0 shrink-0 rounded border border-stone-300 bg-white px-0.5 py-1 text-center font-mono text-xs text-stone-900 tabular-nums placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60 sm:w-11 sm:px-1 sm:text-sm"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        aria-label={`Quantity for ${quantityLabel}`}
      />
      <div
        className="flex shrink-0 flex-col gap-px"
        role="group"
        aria-label={`Adjust quantity for ${quantityLabel}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChangeValue(stepQuantityString(value, 1))}
          className="flex h-3 w-3.5 items-center justify-center rounded-sm text-[8px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700 active:bg-stone-200 sm:h-3.5 sm:w-4 sm:text-[9px] disabled:opacity-40"
          aria-label={`Increase quantity for ${quantityLabel}`}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChangeValue(stepQuantityString(value, -1))}
          className="flex h-3 w-3.5 items-center justify-center rounded-sm text-[8px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700 active:bg-stone-200 sm:h-3.5 sm:w-4 sm:text-[9px] disabled:opacity-40"
          aria-label={`Decrease quantity for ${quantityLabel}`}
        >
          ↓
        </button>
      </div>
    </div>
  )
}
