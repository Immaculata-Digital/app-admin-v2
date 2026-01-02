import { useEffect, useState, type ReactNode } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { SearchProvider } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../Sidebar'
import Topbar from '../Topbar'
import './style.css'

type MainLayoutProps = {
  children?: ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated, loading, refreshPermissions } = useAuth()
  const location = useLocation()
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [themeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem('concordia-theme-mode') as 'light' | 'dark' | null
    return stored ?? (prefersDark ? 'dark' : 'light')
  })

  // Redirecionar para login se não estiver autenticado
  if (!loading && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (themeMode === 'dark') {
      root.classList.add('theme-dark')
    } else {
      root.classList.remove('theme-dark')
    }
    window.localStorage.setItem('concordia-theme-mode', themeMode)
  }, [themeMode])

  // Atualizar permissões ao navegar (apenas se já estiver autenticado e não estiver carregando)
  // Usar debounce mais longo e verificar se realmente precisa atualizar
  useEffect(() => {
    if (!isAuthenticated || loading) return

    // Debounce mais longo para evitar chamadas muito frequentes
    const timeoutId = setTimeout(() => {
      // Verificar se token ainda é válido antes de tentar refresh
      const token = localStorage.getItem('concordia_access_token')
      if (token) {
        refreshPermissions()
      }
    }, 500) // Aumentado de 100ms para 500ms
    
    return () => clearTimeout(timeoutId)
  }, [location.pathname, isAuthenticated, loading, refreshPermissions])

  return (
    <SearchProvider>
      <Box className="main-layout">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <Box component="section" className="main-layout__content">
          <Topbar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />
          <Box component="main" className="main-layout__page">
            {children ?? <Outlet />}
          </Box>
        </Box>
      </Box>
    </SearchProvider>
  )
}

export default MainLayout
