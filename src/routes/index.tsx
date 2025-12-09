import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from '../pages/Login'
import ForgotPasswordPage from '../pages/ForgotPassword'
import UsersPage from '../pages/Users'
import AccessGroupsPage from '../pages/AccessGroups'
import DashboardPage from '../pages/Dashboard'
import LojasPage from '../pages/Lojas'
import ItensRecompensaPage from '../pages/ItensRecompensa'
import ClientesPage from '../pages/Clientes'
import ClienteDetalhesPage from '../pages/ClienteDetalhes'
import ResgateDetalhesPage from '../pages/ResgateDetalhes'
import SetPasswordPage from '../pages/SetPassword'
import ConfiguracoesPage from '../pages/Configuracoes'
import MainLayout from '../components/MainLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// Componente para redirecionar baseado na autenticação
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Carregando...
      </div>
    )
  }
  
  if (isAuthenticated) {
    return null // Será redirecionado pelo useEffect
  }
  
  return <LoginPage />
}

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/account/set-password" element={<SetPasswordPage />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/grupos-usuarios" element={<AccessGroupsPage />} />
        <Route path="/lojas" element={<LojasPage />} />
        <Route path="/itens-recompensa" element={<ItensRecompensaPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:id" element={<ClienteDetalhesPage />} />
        <Route path="/resgates/:id" element={<ResgateDetalhesPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRoutes

