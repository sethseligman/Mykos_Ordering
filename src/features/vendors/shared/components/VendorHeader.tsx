import type { Vendor } from '../../../../types/order'

const channelLabel: Record<Vendor['channel'], string> = {
  text: 'SMS',
  email: 'Email',
  phone: 'Phone',
  portal: 'Portal',
  other: 'Other',
}

type Props = { vendor: Vendor }

export function VendorHeader({ vendor }: Props) {
  return (
    <header className="border-b border-stone-300 bg-stone-50/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-sans text-xl font-semibold tracking-tight text-stone-900">
          {vendor.name}
        </h1>
        <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {channelLabel[vendor.channel]}
        </span>
      </div>
    </header>
  )
}
