import { api } from './api'
import { getTenantSchema } from '../utils/schema'

export interface LoginCredentials {
  loginOrEmail: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    fullName: string
    login: string
    email: string
    id_loja?: number
  }
}

export interface AuthUser {
  id: string
  fullName: string
  login: string
  email: string
  id_loja?: number
}

const TOKEN_KEY = 'concordia_access_token'
const REFRESH_TOKEN_KEY = 'concordia_refresh_token'
const USER_KEY = 'concordia_user'

export const authService = {
  /**
   * Realiza login e armazena tokens e dados do usuário
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Obter schema da URL
    const schema = getTenantSchema()
    console.log('[authService.login] Schema extraído para login:', schema)

    // skipAuth=true porque ainda não temos o token
    // Enviar schema no header X-Schema
    const response = await api.post<LoginResponse>(
      '/auth/login', 
      credentials, 
      { 
        skipAuth: true,
        headers: {
          'X-Schema': schema
        }
      }
    )

    // Armazenar tokens e dados do usuário (Sempre localStorage)
    localStorage.setItem(TOKEN_KEY, response.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))

    return response
  },

  /**
   * Solicita recuperação de senha
   */
  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return await api.post<{ status: string; message: string }>(
      '/users/password/reset-request',
      { 
        email,
        web_url: window.location.origin // URL base do front-end
      },
      { skipAuth: true }
    )
  },

  /**
   * Atualiza o token de acesso usando o refresh token
   */
  async refreshToken(): Promise<LoginResponse | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    try {
      // skipAuth=true para evitar loop infinito se usarmos interceptors que checam token
      const response = await api.post<LoginResponse>('/auth/refresh-token', { refreshToken }, { skipAuth: true })

      // Atualizar tokens mantendo o armazenamento original (local ou session)
      // Como não sabemos qual era o armazenamento original facilmente aqui, vamos tentar manter onde estava o refresh token
      const isSession = !!sessionStorage.getItem(REFRESH_TOKEN_KEY)
      const storage = isSession ? sessionStorage : localStorage
      
      storage.setItem(TOKEN_KEY, response.accessToken)
      storage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
      // Opcional: atualizar dados do usuário se vierem atualizados
      // storage.setItem(USER_KEY, JSON.stringify(response.user))

      return response
    } catch (error) {
      console.error('Erro ao atualizar token:', error)

      // Não fazer logout imediato em caso de erro no refresh
      // O token atual pode ainda ser válido por alguns segundos
      // Apenas retornar null e deixar que o sistema tente usar o token atual
      // O logout só deve acontecer quando realmente necessário (token expirado e refresh falhou)
      return null
    }
  },

  /**
   * Realiza logout e remove tokens
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken()

    // Sempre remove os tokens localmente, mesmo se a chamada ao servidor falhar
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)

    // Tenta invalidar o token no servidor (opcional, não bloqueia o logout)
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken }, { skipAuth: false })
      } catch (error) {
        // Ignorar erros no logout (token pode já estar expirado ou servidor offline)
        // O logout local já foi feito acima
      }
    }
  },

  /**
   * Obtém o access token armazenado
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  },

  /**
   * Obtém o refresh token armazenado
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Obtém os dados do usuário armazenados
   */
  getUser(): AuthUser | null {
    const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    if (!userStr) return null

    try {
      return JSON.parse(userStr) as AuthUser
    } catch {
      return null
    }
  },

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  },

  /**
   * Decodifica o JWT token (sem verificar assinatura, apenas para ler dados)
   */
  decodeToken(token: string): { permissions?: string[]; exp?: number } | null {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  },

  /**
   * Obtém as permissões do usuário do token
   */
  getPermissions(): string[] {
    const token = this.getAccessToken()
    if (!token) return []

    const decoded = this.decodeToken(token)
    return decoded?.permissions || []
  },

  /**
   * Verifica se o token está expirado
   */
  isTokenExpired(): boolean {
    const token = this.getAccessToken()
    if (!token) return true

    const decoded = this.decodeToken(token)
    if (!decoded?.exp) return true

    // exp está em segundos, Date.now() está em milissegundos
    return decoded.exp * 1000 < Date.now()
  },
}

