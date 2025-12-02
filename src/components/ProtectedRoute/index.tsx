import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  requireAny?: boolean
}

/**
 * Componente que protege rotas, verificando autenticação e opcionalmente permissões
 */
export const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [],
  requireAny = false 
}: ProtectedRouteProps) => {
  const { isAuthenticated, permissions, loading } = useAuth()

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Carregando...
      </div>
    )
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Verificar permissões se necessário
  if (requiredPermissions.length > 0) {
    const hasPermission = requireAny
      ? requiredPermissions.some((perm) => permissions.includes(perm))
      : requiredPermissions.every((perm) => permissions.includes(perm))

    if (!hasPermission) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
          <p>Permissões necessárias: {requiredPermissions.join(', ')}</p>
        </div>
      )
    }
  }

  return <>{children}</>
}

