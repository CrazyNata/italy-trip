import { HashRouter } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { ConfirmProvider } from '../components/ConfirmDialog'
import { AppearanceProvider } from '../appearance/AppearanceContext'
import { AccountMenu, AuthGate, AuthProvider, useAuth } from '../auth'
import { TripDataProvider } from '../trip/TripDataContext'

function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (loading) return <div aria-label="Проверяем сессию" className="fixed inset-0 z-[99999] grid place-items-center bg-[#eaf1f1]"><div className="size-8 animate-spin rounded-full border-2 border-[#d5e2e1] border-t-[#2a7089]" /></div>
  if (!user) return <AuthGate />

  return <TripDataProvider><ConfirmProvider><AppShell /><AccountMenu /></ConfirmProvider></TripDataProvider>
}

export function App() {
  return <HashRouter><AuthProvider><AppearanceProvider><AuthenticatedApp /></AppearanceProvider></AuthProvider></HashRouter>
}
