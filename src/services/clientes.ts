// A URL da API de clientes será construída usando a mesma base da API admin
// ou pode ser configurada via variável de ambiente
const getClientesApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_CLIENTES_V2_URL
  if (envUrl) return envUrl
  // Fallback: usar a mesma porta padrão da API de clientes
  return 'http://localhost:7773/api'
}

const API_CLIENTES_BASE_URL = getClientesApiUrl()

const getAccessToken = (): string | null => {
  return localStorage.getItem('concordia_access_token')
}

type RequestOptions = RequestInit & {
  parseJson?: boolean
  skipAuth?: boolean
}

async function request<TResponse>(path: string, options: RequestOptions = {}) {
  const { parseJson = true, headers, skipAuth = false, ...rest } = options

  const authHeaders: Record<string, string> = {}
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_CLIENTES_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
      ...headers,
    },
    ...rest,
  })

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const data = await response.json()
      message = data?.message ?? data?.error ?? message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  if (!parseJson || response.status === 204) {
    return null as TResponse
  }

  return (await response.json()) as TResponse
}

export interface ClienteDTO {
  id_cliente: number
  id_usuario: number
  id_loja: number
  nome_completo: string
  email: string
  whatsapp: string
  cep: string
  sexo: 'M' | 'F'
  saldo: number
  aceite_termos: boolean
  dt_cadastro: string
  usu_cadastro: number
  dt_altera?: string | null
  usu_altera?: number | null
}

export interface CreateClientePayload {
  id_loja: number
  nome_completo: string
  email: string
  whatsapp: string
  cep: string
  sexo: 'M' | 'F'
  aceite_termos: boolean
  senha: string
}

export interface UpdateClientePayload {
  id_loja?: number
  nome_completo?: string
  email?: string
  whatsapp?: string
  cep?: string
  sexo?: 'M' | 'F'
  saldo?: number
  aceite_termos?: boolean
}

export interface ListClientesResponse {
  data: ClienteDTO[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const clienteService = {
  list: async (schema: string, filters: { limit?: number; offset?: number; search?: string; id_loja?: number }): Promise<ListClientesResponse> => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.id_loja) params.append('id_loja', filters.id_loja.toString())

    return request<ListClientesResponse>(`/clientes/${schema}?${params.toString()}`)
  },

  getById: async (schema: string, id: number): Promise<ClienteDTO> => {
    return request<ClienteDTO>(`/clientes/${schema}/${id}`)
  },

  create: async (schema: string, payload: CreateClientePayload): Promise<ClienteDTO> => {
    return request<ClienteDTO>(`/clientes/${schema}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  createPublic: async (schema: string, payload: CreateClientePayload): Promise<ClienteDTO> => {
    return request<ClienteDTO>(`/clientes/publico/${schema}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    })
  },

  update: async (schema: string, id: number, payload: UpdateClientePayload): Promise<ClienteDTO> => {
    return request<ClienteDTO>(`/clientes/${schema}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  remove: async (schema: string, id: number): Promise<void> => {
    return request<void>(`/clientes/${schema}/${id}`, {
      method: 'DELETE',
    })
  },
}
