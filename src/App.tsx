import { useState } from 'react'
import { AddVendorScreen } from './features/vendors/admin/AddVendorScreen'
import { VendorAdminScreen } from './features/vendors/admin/VendorAdminScreen'
import { AceEndicoVendorWorkspace } from './features/vendors/ace-endico/AceEndicoVendorWorkspace'
import { DartagnanVendorWorkspace } from './features/vendors/dartagnan/DartagnanVendorWorkspace'
import { OptimaVendorWorkspace } from './features/vendors/optima/OptimaVendorWorkspace'
import { OrderPortalScreen } from './features/vendors/shared/components/OrderPortalScreen'

type ActiveView =
  | 'portal'
  | 'dartagnan'
  | 'ace-endico'
  | 'optima'
  | 'admin'
  | 'addVendor'

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('portal')
  const [portalRefresh, setPortalRefresh] = useState(0)

  const openVendor = (vendorId: string) => {
    if (vendorId === 'dartagnan') setActiveView('dartagnan')
    else if (vendorId === 'ace-endico') setActiveView('ace-endico')
    else if (vendorId === 'optima') setActiveView('optima')
  }

  const backToPortal = () => {
    setActiveView('portal')
    setPortalRefresh((n) => n + 1)
  }

  if (activeView === 'dartagnan') {
    return <DartagnanVendorWorkspace onBack={backToPortal} />
  }

  if (activeView === 'optima') {
    return <OptimaVendorWorkspace onBack={backToPortal} />
  }

  if (activeView === 'ace-endico') {
    return <AceEndicoVendorWorkspace onBack={backToPortal} />
  }

  if (activeView === 'admin') {
    return (
      <VendorAdminScreen
        onBack={backToPortal}
        onAddVendor={() => setActiveView('addVendor')}
      />
    )
  }

  if (activeView === 'addVendor') {
    return (
      <AddVendorScreen onBack={() => setActiveView('admin')} />
    )
  }

  return (
    <OrderPortalScreen
      refreshKey={String(portalRefresh)}
      onOpenVendor={openVendor}
      onOpenVendorAdmin={() => setActiveView('admin')}
    />
  )
}

export default App
