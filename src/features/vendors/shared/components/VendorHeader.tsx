import type { Vendor } from '../../../../types/order'

const channelLabel: Record<Vendor['channel'], string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  portal: 'Portal',
  other: 'Other',
}

type Props = { vendor: Vendor }

export function VendorHeader({ vendor }: Props) {
  return (
    <header className="border-b border-stone-300 bg-stone-50/80 px-5 py-4 backdrop-blur-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Vendor
          </p>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-stone-900">
            {vendor.name}
          </h1>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:mt-0 sm:flex sm:flex-wrap sm:gap-x-8">
          <div>
            <dt className="text-stone-500">Rep</dt>
            <dd className="font-medium text-stone-800">{vendor.repNames}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Channel</dt>
            <dd className="font-medium text-stone-800">
              {channelLabel[vendor.channel]}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-stone-500">Order day</dt>
            <dd className="font-medium text-stone-800">{vendor.orderDays}</dd>
          </div>
        </dl>
      </div>
    </header>
  )
}
