import { createContext, useContext, useState, useEffect } from 'react'
import type { Theme, ThemeColors } from './theme'
import { themeColors } from './theme'

interface ThemeCtx {
  theme: Theme
  colors: ThemeColors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  colors: themeColors('light'),
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Defensive: chrome APIs may be unavailable in some sandboxed iframes
    try {
      chrome.storage.local.get('theme').then(({ theme: stored }) => {
        if (stored === 'dark' || stored === 'light') setTheme(stored as Theme)
      }).catch(() => {})
    } catch { /* no chrome context */ }

    let removeListener: (() => void) | null = null
    try {
      const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
        if (area !== 'local' || !('theme' in changes)) return
        const next = changes.theme.newValue
        if (next === 'dark' || next === 'light') setTheme(next)
      }
      chrome.storage.onChanged.addListener(listener)
      removeListener = () => chrome.storage.onChanged.removeListener(listener)
    } catch { /* no chrome context */ }

    return () => { try { removeListener?.() } catch { /* ignore */ } }
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try {
      chrome.storage.local.set({ theme: next }).catch(() => {})
    } catch { /* no chrome context */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, colors: themeColors(theme), toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
