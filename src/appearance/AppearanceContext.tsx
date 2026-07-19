import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeName = 'Терракота' | 'Охра' | 'Олива'

const themes: Record<ThemeName, Record<string, string>> = {
  Терракота: { '--ac': '#b5623c', '--ac2': '#d99a4e', '--bg': '#f7f3ec' },
  Охра: { '--ac': '#c1873e', '--ac2': '#b5623c', '--bg': '#f7f3ec' },
  Олива: { '--ac': '#6b7355', '--ac2': '#b5623c', '--bg': '#f7f3ec' },
}

const lightPalette = { '--ink': '#26221d', '--card': '#fcfaf5', '--line': '#e5ddd0', '--muted': '#8a8479', '--soft': '#f1ebe0', '--track': '#ece4d6', '--paper': '#fcfaf5', '--ol': '#6b7355' }
const darkPalette = { '--card': '#2c2721', '--line': '#3d362c', '--ink': '#ece4d6', '--muted': '#a99d89', '--soft': '#241f1a', '--track': '#38322b', '--bg': '#1e1a16', '--paper': '#342e27' }

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
