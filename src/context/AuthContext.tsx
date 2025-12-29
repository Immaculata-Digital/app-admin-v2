import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
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
  const [justLoggedIn, setJustLoggedIn] = useState(false)

  // Carregar dados do usuário ao montar o componente
  useEffect(() => {
    const loadAuth = async () => {
      // Se acabou de fazer login, não executar loadAuth para evitar conflitos
      if (justLoggedIn) {
        setLoading(false)
        return
      }

      const storedUser = authService.getUser()
      const storedPermissions = authService.getPermissions()

      if (storedUser && authService.isAuthenticated() && !authService.isTokenExpired()) {
        setUser(storedUser)
        setPermissions(storedPermissions)
        
        // Carregar menus de forma não bloqueante
        menusService.getAll()
          .then((menusData) => {
            setMenus(menusData || [])
          })
          .catch((error) => {
            console.error('Erro ao carregar menus:', error)
            // Não limpar dados se houver erro ao carregar menus
          })
      } else if (storedUser) {
        // Se há usuário mas token inválido/expirado, tentar refresh antes de limpar
        try {
          const refreshResponse = await authService.refreshToken()
          if (refreshResponse) {
            // Token renovado com sucesso
            setUser(storedUser)
            setPermissions(authService.getPermissions())
            menusService.getAll()
              .then((menusData) => {
                setMenus(menusData || [])
              })
              .catch((error) => {
                console.error('Erro ao carregar menus:', error)
              })
          } else {
            // Refresh falhou, limpar dados
            authService.logout()
            setUser(null)
            setPermissions([])
            setMenus([])
          }
        } catch (error) {
          // Erro no refresh, limpar dados
          console.error('Erro ao renovar token:', error)
          authService.logout()
          setUser(null)
          setPermissions([])
          setMenus([])
        }
      } else {
        // Sem usuário armazenado, garantir que está limpo
        setUser(null)
        setPermissions([])
        setMenus([])
      }

      setLoading(false)
    }

    loadAuth()
  }, [justLoggedIn])

  const login = async (credentials: { loginOrEmail: string; password: string }) => {
    // Não alterar loading do contexto durante login para evitar re-renderizações
    // O componente de login usa seu próprio estado de loading
    setJustLoggedIn(true) // Marcar que acabou de fazer login
    try {
      const response = await authService.login(credentials)
      
      // Verificar se o token foi armazenado corretamente antes de atualizar o estado
      if (!authService.isAuthenticated() || authService.isTokenExpired()) {
        throw new Error('Falha ao armazenar token de autenticação')
      }
      
      // Atualizar estado do usuário e permissões PRIMEIRO
      setUser(response.user)
      const newPermissions = authService.getPermissions()
      setPermissions(newPermissions)
      
      // Carregar menus após login de forma assíncrona e não bloqueante
      // Não aguardar o resultado para não bloquear o fluxo de login
      menusService.getAll()
        .then((menusData) => {
          setMenus(menusData || [])
        })
        .catch((error) => {
          console.error('Erro ao carregar menus (não crítico):', error)
          // Não limpar autenticação se houver erro ao carregar menus
          // O usuário já está autenticado, apenas não terá os menus por enquanto
        })
      
      // Resetar a flag após um pequeno delay para permitir que o componente seja renderizado
      setTimeout(() => {
        setJustLoggedIn(false)
      }, 1000)
    } catch (error) {
      // Se houver erro no login, apenas limpar a flag
      // Não alterar estados do contexto para evitar re-renderizações que causam "piscada"
      setJustLoggedIn(false)
      throw error
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
      // Se o token ainda não expirou, apenas atualizar permissões do token atual
      if (!authService.isTokenExpired()) {
        setPermissions(authService.getPermissions())
        // Atualizar menus também
        try {
          const menusData = await menusService.getAll()
          setMenus(menusData || [])
        } catch (error) {
          console.error('Erro ao carregar menus:', error)
        }
        return
      }

      // Se o token expirou, tentar fazer refresh
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
      } else {
        // Se o refresh falhou, fazer logout apenas se realmente necessário
        // Não fazer logout aqui para evitar loops
        console.warn('Não foi possível atualizar o token')
      }
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error)
      // Não fazer logout aqui para evitar loops infinitos
    }
  }, [])

  // Calcular isAuthenticated de forma mais robusta
  // Usar useMemo para evitar recálculos desnecessários
  // Recalcular apenas quando user mudar ou quando loading mudar
  const isAuthenticated = useMemo(() => {
    if (!user || loading) return false
    
    const hasToken = authService.isAuthenticated()
    if (!hasToken) return false
    
    const tokenValid = !authService.isTokenExpired()
    
    return tokenValid
  }, [user, loading])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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

