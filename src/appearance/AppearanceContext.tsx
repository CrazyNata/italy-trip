import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeName = 'Терракота' | 'Охра' | 'Олива'

const themes: Record<ThemeName, Record<string, string>> = {
  Терракота: { '--ac': '#2a7089', '--ac2': '#d99a4e', '--bg': '#eaf1f1', '--ink': '#173a3d', '--card': '#fff', '--line': '#d5e2e1', '--muted': '#5f7c7e', '--soft': '#f1f7f6', '--track': '#dbeae8', '--paper': '#f4faf9' },
  Охра: { '--ac': '#d99a4e', '--ac2': '#2a7089', '--bg': '#f4efe2', '--ink': '#3b3228', '--card': '#fff', '--line': '#e7dcc7', '--muted': '#8a7d6b', '--soft': '#fdfaf3', '--track': '#efe4cf', '--paper': '#fbf2df' },
  Олива: { '--ac': '#5f8a6a', '--ac2': '#2a7089', '--bg': '#e9f1ec', '--ink': '#263d31', '--card': '#fff', '--line': '#d7e2d9', '--muted': '#687d6e', '--soft': '#f3f8f4', '--track': '#deeadf', '--paper': '#f6faf6' },
}

interface AppearanceContextValue { theme: ThemeName; dark: boolean; setTheme: (theme: ThemeName) => void; toggleDark: () => void }
const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function initialTheme(): ThemeName {
  try { const value = localStorage.getItem('italy_theme'); if (value && value in themes) return value as ThemeName } catch { /* Use default. */ }
  return 'Терракота'
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme)
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('italy_dark') === '1' } catch { return false } })

  useEffect(() => {
    const palette = dark ? { ...themes[theme], '--bg': '#172323', '--ink': '#edf3ef', '--card': '#223130', '--line': '#3b4c49', '--muted': '#aabbb6', '--soft': '#1c2928', '--track': '#2b3c39', '--paper': '#263634' } : themes[theme]
    for (const [key, value] of Object.entries(palette)) document.documentElement.style.setProperty(key, value)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [theme, dark])

  function setTheme(value: ThemeName) { setThemeState(value); try { localStorage.setItem('italy_theme', value) } catch { /* Preference remains in memory. */ } }
  function toggleDark() { setDark((value) => { const next = !value; try { localStorage.setItem('italy_dark', next ? '1' : '0') } catch { /* Preference remains in memory. */ } return next }) }

  return <AppearanceContext.Provider value={{ theme, dark, setTheme, toggleDark }}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider')
  return value
}
