import { useState, type ReactNode } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Outlet, Navigate } from 'react-router-dom'
import { SearchProvider } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../Sidebar'
import Topbar from '../Topbar'
import './style.css'

type MainLayoutProps = {
  children?: ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated, loading } = useAuth()
  // Theme logic moved to ThemeContext
  // MainLayout just renders structure

  const [sidebarOpen, setSidebarOpen] = useState(true)

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


  return (
    <SearchProvider>
      <Box className="main-layout">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <Box component="section" className="main-layout__content">
          <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <Box component="main" className="main-layout__page">
            {children ?? <Outlet />}
          </Box>
        </Box>
      </Box>
    </SearchProvider>
  )
}

export default MainLayout
