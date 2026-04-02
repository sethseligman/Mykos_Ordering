import type { Vendor } from '../../../types/order'
import { optimaPlatformConfig } from './optimaVendorConfig'
import { optimaRules } from './optimaRules'

export const optimaVendor: Vendor = {
  id: optimaPlatformConfig.id,
  name: optimaPlatformConfig.settings.profile.displayName,
  repNames: 'Lacavos (Optima)',
  primaryRepFirstName: 'Team',
  channel: 'text',
  orderDays: optimaRules.orderDays.join(' / '),
  activeOrderDay: optimaRules.deliveryDays[0],
  orderDueDay: optimaRules.orderDays[0],
  deliveryDay: optimaRules.deliveryDays[0],
  channelType: 'sms',
  contactValue: optimaPlatformConfig.settings.profile.contactValue,
  sendMode: 'native',
}
