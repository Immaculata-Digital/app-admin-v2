import { useEffect, useState, type ReactNode } from 'react'
import { Box } from '@mui/material'
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
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
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
        Carregando...
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

  // Atualizar permissões ao navegar
  useEffect(() => {
    if (isAuthenticated) {
      refreshPermissions()
    }
  }, [location.pathname, isAuthenticated, refreshPermissions])

  return (
    <SearchProvider>
      <Box className="main-layout">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          themeMode={themeMode}
          onChangeTheme={setThemeMode}
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
