import type { VendorDashboardStatus } from '../../../../types/portal'

const statusPillClass: Record<VendorDashboardStatus, string> = {
  not_started:
    'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
  draft: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80',
  draft_ready:
    'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80',
  sent: 'bg-stone-200 text-stone-800 ring-1 ring-stone-300/80',
}

const statusLabelText: Record<VendorDashboardStatus, string> = {
  not_started: 'Not Started',
  draft: 'In Progress',
  draft_ready: 'Draft Ready',
  sent: 'Sent',
}

type Props = {
  name: string
  category?: string
  /** e.g. "Order Sunday for Tuesday delivery" */
  operationalLine: string
  /** e.g. "Last sent Mar 27" / "Suggested order ready" / "Draft not started" */
  statusDetailLine: string
  status: VendorDashboardStatus
  savedAt?: string | null
  actionLabel: string
  onNavigate: () => void
}

export function VendorCard({
  name,
  category,
  operationalLine,
  statusDetailLine,
  status,
  savedAt,
  actionLabel,
  onNavigate,
}: Props) {
  return (
    <article className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{name}</h3>
          {category ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-stone-500">
              {category}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass[status]}`}
        >
          {statusLabelText[status]}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <p className="font-medium leading-snug text-stone-800">
          {operationalLine}
        </p>
        <p className="leading-snug text-stone-600">{statusDetailLine}</p>
        {savedAt ? (
          <p className="text-xs text-stone-400">Saved {savedAt}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNavigate}
        className="mt-4 w-full rounded-md border border-stone-800 bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 shadow-sm hover:bg-stone-800 active:bg-stone-950"
      >
        {actionLabel}
      </button>
    </article>
  )
}
