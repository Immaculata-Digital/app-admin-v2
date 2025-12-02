import { api, ApiError } from './api'

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
  }
}

export interface AuthUser {
  id: string
  fullName: string
  login: string
  email: string
}

const TOKEN_KEY = 'concordia_access_token'
const REFRESH_TOKEN_KEY = 'concordia_refresh_token'
const USER_KEY = 'concordia_user'

export const authService = {
  /**
   * Realiza login e armazena tokens e dados do usuário
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // skipAuth=true porque ainda não temos o token
    const response = await api.post<LoginResponse>('/auth/login', credentials, { skipAuth: true })

    // Armazenar tokens e dados do usuário
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
      { email },
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

      // Atualizar tokens
      localStorage.setItem(TOKEN_KEY, response.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken)
      // Opcional: atualizar dados do usuário se vierem atualizados
      // localStorage.setItem(USER_KEY, JSON.stringify(response.user))

      return response
    } catch (error) {
      console.error('Erro ao atualizar token:', error)

      // Apenas fazer logout se for erro de autenticação (401)
      if (error instanceof ApiError && error.status === 401) {
        await this.logout()
      }
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
    return localStorage.getItem(TOKEN_KEY)
  },

  /**
   * Obtém o refresh token armazenado
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Obtém os dados do usuário armazenados
   */
  getUser(): AuthUser | null {
    const userStr = localStorage.getItem(USER_KEY)
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

