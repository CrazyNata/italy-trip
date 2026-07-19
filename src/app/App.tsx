import { HashRouter } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { ConfirmProvider } from '../components/ConfirmDialog'
import { AppearanceProvider } from '../appearance/AppearanceContext'
import { AccountMenu, AuthGate, AuthProvider, useAuth } from '../auth'
import { TripDataProvider } from '../trip/TripDataContext'

function AuthenticatedApp() {
  const { user, loading } = useAuth()

  if (loading) return <div aria-label="Проверяем сессию" className="fixed inset-0 z-[99999] grid place-items-center bg-[#f7f3ec]"><div className="size-8 animate-spin rounded-full border-2 border-[#e5ddd0] border-t-[#b5623c]" /></div>
  if (!user) return <AuthGate />

  return <TripDataProvider><ConfirmProvider><AppShell /><AccountMenu /></ConfirmProvider></TripDataProvider>
}

export function App() {
  return <HashRouter><AuthProvider><AppearanceProvider><AuthenticatedApp /></AppearanceProvider></AuthProvider></HashRouter>
}
