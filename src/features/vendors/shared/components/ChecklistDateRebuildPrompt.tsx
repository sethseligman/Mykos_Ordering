import { formatShortDeliveryDate } from '../vendorScheduling/weekdayUtils'

type Props = {
  pendingRebuildDate: string | null
  onRebuild: () => void
  onKeepCurrent: () => void
}

export function ChecklistDateRebuildPrompt({
  pendingRebuildDate,
  onRebuild,
  onKeepCurrent,
}: Props) {
  if (!pendingRebuildDate) return null

    return (
      <div className="mb-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm text-blue-950">
        <p className="font-medium">
          Delivery date changed. Rebuild suggested order for{' '}
          {formatShortDeliveryDate(pendingRebuildDate)}?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRebuild}
            className="rounded border border-blue-400 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 shadow-sm hover:bg-blue-100"
          >
            Rebuild now
          </button>
          <button
            type="button"
            onClick={onKeepCurrent}
            className="rounded border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-200"
          >
            Keep current draft
          </button>
        </div>
      </div>
    )
}
