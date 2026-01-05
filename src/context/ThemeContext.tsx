import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { configuracoesService } from '../services/configuracoes'
import { getTenantSchema } from '../utils/schema'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  // Branding
  appName: string
  brandColor?: string
  logoBase64?: string
  loadingBranding: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('concordia-theme-mode') as Theme
    return savedTheme || 'system'
  })

  // Branding State
  const [appName] = useState('Concordia ERP')
  const [brandColor, setBrandColor] = useState<string | undefined>(undefined)
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined)
  const [loadingBranding, setLoadingBranding] = useState(true)

  // Fetch Branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const schema = getTenantSchema()
        // Try to fetch with skipAuth to avoid redirect loop on login page
        const config = await configuracoesService.getFirst(schema, { skipAuth: true })
        
        if (config) {
          if (config.cor_botao) {
             setBrandColor(config.cor_botao)
          }
          if (config.logo_base64) {
            setLogoBase64(config.logo_base64)
          }
          // Assuming we stick to "Concordia ERP" unless explicit branding overrides
        }
      } catch (err) {
        console.error('Failed to load branding:', err)
      } finally {
        setLoadingBranding(false)
      }
    }
    fetchBranding()
  }, [])

  // Determine resolved theme
  const getResolvedTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(getResolvedTheme())

  // Apply Theme & Branding to DOM
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
    
    // Apply Branding Colors Global CSS Vars
    if (brandColor) {
      root.style.setProperty('--brand-primary', brandColor)
      root.style.setProperty('--brand-primary-hover', brandColor) 
    } else {
      root.style.removeProperty('--brand-primary')
      root.style.removeProperty('--brand-primary-hover')
    }

    // Listener for system preference changes if in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, brandColor])

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
          main: brandColor || '#1976d2', // Default MUI blue if no brand color
        },
      },
      typography: {
        fontFamily: "'Poppins', sans-serif", // Enforce font globally
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
  }, [resolvedTheme, brandColor])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      resolvedTheme,
      appName,
      brandColor,
      logoBase64,
      loadingBranding
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

