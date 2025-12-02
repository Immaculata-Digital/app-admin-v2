import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService, type AuthUser } from '../services/auth'
import { menusService, type MenuDefinition } from '../services/menus'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  permissions: string[]
  menus: MenuDefinition[]
  login: (credentials: { loginOrEmail: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshPermissions: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [menus, setMenus] = useState<MenuDefinition[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar dados do usuário ao montar o componente
  useEffect(() => {
    const loadAuth = async () => {
      const storedUser = authService.getUser()
      const storedPermissions = authService.getPermissions()

      if (storedUser && authService.isAuthenticated() && !authService.isTokenExpired()) {
        setUser(storedUser)
        setPermissions(storedPermissions)
        
        // Carregar menus
        try {
          const menusData = await menusService.getAll()
          setMenus(menusData || [])
        } catch (error) {
          console.error('Erro ao carregar menus:', error)
        }
      } else {
        // Token expirado ou inválido, limpar dados
        authService.logout()
        setUser(null)
        setPermissions([])
        setMenus([])
      }

      setLoading(false)
    }

    loadAuth()
  }, [])

  const login = async (credentials: { loginOrEmail: string; password: string }) => {
    setLoading(true)
    try {
      const response = await authService.login(credentials)
      setUser(response.user)
      const newPermissions = authService.getPermissions()
      setPermissions(newPermissions)
      
      // Carregar menus após login
      try {
        const menusData = await menusService.getAll()
        setMenus(menusData || [])
      } catch (error) {
        console.error('Erro ao carregar menus:', error)
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setPermissions([])
      setMenus([])
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await authService.refreshToken()
      if (response) {
        setPermissions(authService.getPermissions())
        // Atualizar menus também
        try {
          const menusData = await menusService.getAll()
          setMenus(menusData || [])
        } catch (error) {
          console.error('Erro ao carregar menus:', error)
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && authService.isAuthenticated() && !authService.isTokenExpired(),
        permissions,
        menus,
        login,
        logout,
        refreshPermissions,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

