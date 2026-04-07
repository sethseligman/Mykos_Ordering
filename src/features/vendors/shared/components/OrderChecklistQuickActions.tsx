type Props = {
  onBuildFromHistory: () => void
  onClearAll: () => void
  /** Optional note under the buttons (e.g. standing orders). */
  hint?: string
  /** When false, “Build from history” is disabled (e.g. invalid delivery day). */
  buildFromHistoryEnabled?: boolean
  buildFromHistoryTitle?: string
}

const btnDefault =
  'rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 active:bg-stone-100'
const btnMuted =
  'rounded border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-200 active:bg-stone-300/80'

export function OrderChecklistQuickActions({
  onBuildFromHistory,
  onClearAll,
  hint,
  buildFromHistoryEnabled = true,
  buildFromHistoryTitle,
}: Props) {
  return (
    <>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Checklist quick actions"
      >
        <button
          type="button"
          onClick={onBuildFromHistory}
          disabled={!buildFromHistoryEnabled}
          title={buildFromHistoryTitle}
          className={`${btnDefault} disabled:cursor-not-allowed disabled:opacity-45`}
        >
          Build from history
        </button>
        <button type="button" onClick={onClearAll} className={btnMuted}>
          Clear all
        </button>
      </div>
      {hint ? (
        <p className="mb-3 text-xs leading-relaxed text-stone-500">{hint}</p>
      ) : null}
    </>
  )
}
