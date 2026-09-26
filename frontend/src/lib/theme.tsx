import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement
    root.classList.add('[&_*]:!transition-none')
    root.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('parkhub-theme', next)
    } catch {
      /* armazenamento indisponível */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#06080f' : '#f5f6fb')
    setThemeState(next)
    requestAnimationFrame(() => root.classList.remove('[&_*]:!transition-none'))
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
