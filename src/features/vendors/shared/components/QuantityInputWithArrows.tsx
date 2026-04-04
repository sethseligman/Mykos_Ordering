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
    <div className="flex w-full items-center justify-end gap-2 lg:gap-px">
      <input
        type="text"
        inputMode="decimal"
        placeholder="—"
        disabled={disabled}
        className="w-14 min-w-0 shrink-0 rounded border border-stone-300 bg-white px-0.5 py-1 text-center font-mono text-xs text-stone-900 tabular-nums placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-60 sm:w-16 sm:px-1 sm:text-sm lg:w-10"
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
          className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-sm text-[8px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700 active:bg-stone-200 sm:text-[9px] disabled:opacity-40 lg:h-3.5 lg:w-4 lg:text-[9px]"
          aria-label={`Increase quantity for ${quantityLabel}`}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChangeValue(stepQuantityString(value, -1))}
          className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-sm text-[8px] leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700 active:bg-stone-200 sm:text-[9px] disabled:opacity-40 lg:h-3.5 lg:w-4 lg:text-[9px]"
          aria-label={`Decrease quantity for ${quantityLabel}`}
        >
          ↓
        </button>
      </div>
    </div>
  )
}
