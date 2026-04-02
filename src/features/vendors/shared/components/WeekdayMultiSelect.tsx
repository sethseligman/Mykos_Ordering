const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

type Props = {
  label: string
  selectedDays: string[]
  onChange: (next: string[]) => void
  disabledDays?: string[]
}

export function WeekdayMultiSelect({
  label,
  selectedDays,
  onChange,
  disabledDays = [],
}: Props) {
  const selected = new Set(selectedDays)
  const disabled = new Set(disabledDays)

  return (
    <div>
      <p className="text-xs font-semibold text-stone-600">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {WEEK_DAYS.map((day) => {
          const isSelected = selected.has(day)
          const isDisabled = disabled.has(day)
          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return
                if (isSelected) {
                  onChange(selectedDays.filter((d) => d !== day))
                } else {
                  onChange(
                    WEEK_DAYS.filter((d) => selected.has(d) || d === day),
                  )
                }
              }}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                isSelected
                  ? 'border-stone-700 bg-stone-800 text-stone-50'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              } disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400`}
            >
              {day.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

