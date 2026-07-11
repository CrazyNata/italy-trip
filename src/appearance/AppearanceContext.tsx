import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeName = 'Терракота' | 'Охра' | 'Олива'

const themes: Record<ThemeName, Record<string, string>> = {
  Терракота: { '--ac': '#2a7089', '--ac2': '#d99a4e', '--bg': '#eaf1f1' },
  Охра: { '--ac': '#d99a4e', '--ac2': '#2a7089', '--bg': '#f4efe2' },
  Олива: { '--ac': '#5f8a6a', '--ac2': '#2a7089', '--bg': '#e9f1ec' },
}

const lightPalette = { '--ink': '#173a3d', '--card': '#ffffff', '--line': '#d5e2e1', '--muted': '#5f7c7e', '--soft': '#f1f7f6', '--track': '#dbeae8', '--paper': '#f4faf9' }
const darkPalette = { '--card': '#2c2721', '--line': '#3d362c', '--ink': '#ece4d6', '--muted': '#a99d89', '--soft': '#241f1a', '--track': '#38322b', '--bg': '#1e1a16', '--paper': '#342e27' }

interface AppearanceContextValue { theme: ThemeName; dark: boolean; setTheme: (theme: ThemeName) => void; toggleDark: () => void }
const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function initialTheme(): ThemeName {
  try { const value = localStorage.getItem('italy_theme'); if (value && value in themes) return value as ThemeName } catch { /* Use default. */ }
  return 'Олива'
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme)
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('italy_dark') === '1' } catch { return false } })

  useEffect(() => {
    const palette = dark ? { ...themes[theme], ...darkPalette } : { ...themes[theme], ...lightPalette }
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
