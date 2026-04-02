import type { Vendor } from '../../../types/order'
import { aceEndicoPlatformConfig } from './aceEndicoVendorConfig'
import { aceEndicoRules } from './aceEndicoRules'

export const aceEndicoVendor: Vendor = {
  id: aceEndicoPlatformConfig.id,
  name: aceEndicoPlatformConfig.settings.profile.displayName,
  repNames: 'John (Ace / Endico)',
  primaryRepFirstName: 'John',
  channel: 'text',
  orderDays: aceEndicoRules.orderDays.join(' / '),
  activeOrderDay: aceEndicoRules.deliveryDays[0],
  orderDueDay: aceEndicoRules.orderDays[0],
  deliveryDay: aceEndicoRules.deliveryDays[0],
  channelType: 'sms',
  contactValue: aceEndicoPlatformConfig.settings.profile.contactValue,
  sendMode: 'native',
}
