const API_BASE_URL = import.meta.env.VITE_API_USUARIOS_V2_URL ?? 'http://localhost:3333/api'

export class ApiError extends Error {
  message: string
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.message = message
    this.status = status
    this.details = details
  }
}

const TOKEN_KEY = 'concordia_access_token'
const REFRESH_TOKEN_KEY = 'concordia_refresh_token'
const USER_KEY = 'concordia_user'

// Funções auxiliares para evitar dependência circular
const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)

  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

type RequestOptions = RequestInit & {
  parseJson?: boolean
  skipAuth?: boolean
}

async function request<TResponse>(path: string, options: RequestOptions = {}) {
  const { parseJson = true, headers, skipAuth = false, ...rest } = options

  // Adicionar token de autenticação se disponível e não for skipAuth
  const authHeaders: Record<string, string> = {}
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
      ...headers,
    },
    ...rest,
  })

  // Se receber 401 (não autorizado), pode ser token expirado ou inválido
  // 403 (Forbidden) significa que está autenticado mas sem permissão - não deve redirecionar
  if (response.status === 401 && !skipAuth) {
    // Verificar se é uma requisição de menus ou outras rotas não críticas
    // Se for, não limpar autenticação imediatamente para evitar loops
    const isNonCriticalRoute = path.includes('/menus') || path.includes('/permissions')
    
    if (!isNonCriticalRoute) {
      // Remover tokens e redirecionar para login apenas para rotas críticas
      clearAuth()
      if (typeof window !== 'undefined') {
        // Evitar loop de redirecionamento se já estiver na página de login
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          window.location.href = '/'
        }
      }
    }
    // Para rotas não críticas, apenas lançar o erro sem limpar autenticação
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`
    let details: unknown = undefined
    try {
      const data = await response.json()
      message = data?.message ?? message
      details = data?.details
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, response.status, details)
  }

  if (!parseJson || response.status === 204) {
    return null as TResponse
  }

  return (await response.json()) as TResponse
}

export const api = {
  get: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>(path, { method: 'GET', ...options }),
  post: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <TResponse>(path: string, body?: unknown, options?: RequestOptions) =>
    request<TResponse>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: <TResponse>(path: string, options?: RequestOptions) =>
    request<TResponse>(path, { method: 'DELETE', ...options }),
}

