import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('concordia-theme-mode') as Theme
    return savedTheme || 'system'
  })

  // Determine resolved theme
  const getResolvedTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(getResolvedTheme())

  // Apply Theme to DOM
  useEffect(() => {
    const root = window.document.documentElement
    
    // Function to update the DOM based on theme
    const applyTheme = () => {
      const currentResolvedTheme = getResolvedTheme()
      setResolvedTheme(currentResolvedTheme)

      if (currentResolvedTheme === 'dark') {
        root.classList.add('theme-dark')
      } else {
        root.classList.remove('theme-dark')
      }
    }

    applyTheme()
    
    // Listener for system preference changes if in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('concordia-theme-mode', newTheme)
    setThemeState(newTheme)
  }

  // Create MUI Theme
  const muiTheme = useMemo(() => {
    return createTheme({
      palette: {
        mode: resolvedTheme,
        primary: {
          main: '#3c83f5',
        },
      },
      typography: {
        fontFamily: "'Roboto', sans-serif",
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            }
          }
        },
        MuiTextField: {
           styleOverrides: {
             root: {
               '& .MuiOutlinedInput-root': {
                 borderRadius: 8,
               }
             }
           }
        }
      }
    })
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      resolvedTheme,
    }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

