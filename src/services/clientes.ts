// A URL da API de clientes será construída usando a mesma base da API admin
// ou pode ser configurada via variável de ambiente
const getClientesApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_CLIENTES_V2_URL
  if (envUrl) return envUrl
  // Fallback: usar a mesma porta padrão da API de clientes
  return 'http://localhost:7773/api'
}

// URL da API clientes v1 (para movimentações de pontos)
// A API v1 tem os endpoints de movimentação que a v2 ainda não tem
// IMPORTANTE: A API v1 roda na mesma porta que a v2 (7773), mas com rotas diferentes
const getClientesV1ApiUrl = () => {
  // Usar a mesma URL base da v2, pois a v1 está na mesma porta
  // A diferença está apenas nas rotas
  const envUrlV1 = import.meta.env.VITE_API_CLIENTES_URL
  if (envUrlV1) return envUrlV1
  
  // Fallback: usar a mesma porta da API de clientes v2
  // A API v1 e v2 compartilham a mesma base URL
  return 'http://localhost:7773/api'
}

const API_CLIENTES_BASE_URL = getClientesApiUrl()
const API_CLIENTES_V1_BASE_URL = getClientesV1ApiUrl()

// Constante para conversão de pontos: 100 pontos por 1 real
const PONTOS_POR_REAL = 100

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
    let details: unknown = undefined
    try {
      const data = await response.json()
      message = data?.message ?? data?.error ?? message
      details = data?.details
    } catch {
      // ignore parse error
    }
    const error: any = new Error(message)
    error.status = response.status
    error.details = details
    throw error
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

// Tipo Cliente usado no Dashboard (compatível com o formato esperado)
export interface Cliente {
  id_cliente: number
  nome: string
  email: string
  telefone: string
  saldo_pontos: number
  id_loja: number | null
  nome_loja: string | null
}

// Tipo para resposta de código de resgate
export interface CodigoResgateResponse {
  codigo_resgate: string
  resgate_utilizado: boolean
  id_cliente: number
  id_item_recompensa: number
  id_movimentacao: number | null
  cliente_nome?: string
  cliente_saldo?: number
  item_nome?: string
}

// Função para normalizar código CLI-123 para extrair o ID
const normalizeClienteId = (codigo: string | number): number => {
  if (typeof codigo === 'number') {
    return codigo
  }

  const cliMatch = codigo.match(/CLI-(\d+)/i)
  const rawId = cliMatch ? cliMatch[1] : codigo
  const parsed = parseInt(rawId, 10)

  if (Number.isNaN(parsed)) {
    throw new Error('ID de cliente inválido')
  }

  return parsed
}

// Função para fazer requisições na API v1 (para movimentações)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requestV1<TResponse>(path: string, options: RequestOptions = {}) {
  const { parseJson = true, headers, skipAuth = false, ...rest } = options

  const authHeaders: Record<string, string> = {}
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_CLIENTES_V1_BASE_URL}${path}`, {
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
    const error: any = new Error(message)
    error.status = response.status
    throw error
  }

  if (!parseJson || response.status === 204) {
    return null as TResponse
  }

  return (await response.json()) as TResponse
}

export const clienteService = {
  list: async (schema: string, filters: { limit?: number; offset?: number; search?: string; id_loja?: number | number[] }): Promise<ListClientesResponse> => {
    const params = new URLSearchParams()
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.id_loja) {
      if (Array.isArray(filters.id_loja)) {
        params.append('id_loja', filters.id_loja.join(','))
      } else {
        params.append('id_loja', filters.id_loja.toString())
      }
    }

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

  // Buscar cliente por código (CLI-123)
  getByCodigo: async (schema: string, codigo: string): Promise<Cliente> => {
    const clienteId = normalizeClienteId(codigo)
    const clienteDTO = await request<ClienteDTO>(`/clientes/${schema}/${clienteId}`)

    return {
      id_cliente: clienteDTO.id_cliente,
      nome: clienteDTO.nome_completo,
      email: clienteDTO.email,
      telefone: clienteDTO.whatsapp,
      saldo_pontos: clienteDTO.saldo,
      id_loja: clienteDTO.id_loja,
      nome_loja: null, // A API v2 não retorna nome_loja, precisaria buscar separadamente se necessário
    }
  },

  // Creditar pontos ao cliente (usa API v2)
  creditarPontos: async (
    schema: string,
    idCliente: number,
    data: {
      valor_reais: number
      origem: string
      id_loja?: number
      observacao?: string
    }
  ): Promise<{
    id_movimentacao: number
    pontos_creditados: number
    saldo_resultante: number
    valor_reais: number
    taxa_conversao: number
  }> => {
    const clienteId = normalizeClienteId(idCliente)
    const pontosCalculados = Math.floor(data.valor_reais * PONTOS_POR_REAL)

    if (!pontosCalculados || pontosCalculados <= 0) {
      throw new Error('Valor informado não gera pontos suficientes para crédito')
    }

    const payload = {
      tipo: 'CREDITO' as const,
      pontos: pontosCalculados,
      origem: data.origem,
      ...(data.id_loja ? { id_loja: data.id_loja } : {}),
      ...(data.observacao ? { observacao: data.observacao } : {}),
    }

    console.log('[clienteService.creditarPontos] Payload enviado:', {
      endpoint: `/clientes/${schema}/${clienteId}/creditar-pontos`,
      payload,
      id_loja_from_data: data.id_loja,
    })

    // Usa API v2 agora que o endpoint foi criado
    const response = await request<{
      movimentacao: {
        id_movimentacao: number
        pontos: number
        saldo_resultante: number
      }
      saldo_atual: number
    }>(`/clientes/${schema}/${clienteId}/creditar-pontos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const { movimentacao, saldo_atual } = response

    return {
      id_movimentacao: movimentacao.id_movimentacao,
      pontos_creditados: movimentacao.pontos,
      saldo_resultante: movimentacao.saldo_resultante ?? saldo_atual,
      valor_reais: data.valor_reais,
      taxa_conversao: data.valor_reais > 0 ? movimentacao.pontos / data.valor_reais : 0,
    }
  },

  // Buscar código de resgate (usa API v2)
  buscarCodigoResgate: async (schema: string, codigoResgate: string): Promise<CodigoResgateResponse> => {
    const codigoUpper = codigoResgate.toUpperCase().trim()

    if (!codigoUpper || codigoUpper.length !== 5) {
      throw new Error('Código de resgate deve ter 5 caracteres')
    }

    return request<CodigoResgateResponse>(`/clientes/${schema}/codigos-resgate/${codigoUpper}`)
  },

  // Marcar código como utilizado (usa API v2)
  marcarCodigoComoUtilizado: async (
    schema: string,
    idCliente: number,
    codigoResgate: string,
    id_loja?: number
  ): Promise<{
    status: string
    codigo_resgate: string
    resgate_utilizado: boolean
    id_cliente: number
    id_item_recompensa: number
    id_movimentacao: number | null
  }> => {
    const clienteId = normalizeClienteId(idCliente)
    const codigoUpper = codigoResgate.toUpperCase().trim()

    if (!codigoUpper || codigoUpper.length !== 5) {
      throw new Error('Código de resgate deve ter 5 caracteres')
    }

    const payload: { id_loja?: number } = {}
    if (id_loja) {
      payload.id_loja = id_loja
    }

    console.log('[clienteService.marcarCodigoComoUtilizado] Payload enviado:', {
      endpoint: `/clientes/${schema}/${clienteId}/pontos/${codigoUpper}`,
      payload,
      id_loja_from_param: id_loja,
    })

    return request<{
      status: string
      codigo_resgate: string
      resgate_utilizado: boolean
      id_cliente: number
      id_item_recompensa: number
      id_movimentacao: number | null
    }>(`/clientes/${schema}/${clienteId}/pontos/${codigoUpper}`, {
      method: 'PUT',
      body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
    })
  },

  // Buscar detalhes do resgate por ID (usa API v2)
  getDetalhesResgate: async (
    schema: string,
    idResgate: number
  ): Promise<{
    id_resgate: number
    codigo_resgate: string
    resgate_utilizado: boolean
    id_cliente: number
    id_item_recompensa: number
    id_movimentacao: number | null
    dt_resgate: string
    dt_utilizado: string | null
    cliente: {
      id_cliente: number
      nome: string
      email: string
      whatsapp: string
      saldo: number
    }
    item: {
      id_item_recompensa: number
      nome: string
      descricao: string | null
      quantidade_pontos: number
      nao_retirar_loja: boolean
    }
    movimentacao: {
      pontos: number
      saldo_resultante: number
      observacao: string | null
      dt_cadastro: string
    }
    status: 'pendente' | 'entregue'
  }> => {
    return request<{
      id_resgate: number
      codigo_resgate: string
      resgate_utilizado: boolean
      id_cliente: number
      id_item_recompensa: number
      id_movimentacao: number | null
      dt_resgate: string
      dt_utilizado: string | null
      cliente: {
        id_cliente: number
        nome: string
        email: string
        whatsapp: string
        saldo: number
      }
      item: {
        id_item_recompensa: number
        nome: string
        descricao: string | null
        quantidade_pontos: number
        nao_retirar_loja: boolean
      }
      movimentacao: {
        pontos: number
        saldo_resultante: number
        observacao: string | null
        dt_cadastro: string
      }
      status: 'pendente' | 'entregue'
    }>(`/clientes/${schema}/resgates/${idResgate}`)
  },

  // Buscar movimentações do cliente (usa API v2)
  getMovimentacoes: async (
    schema: string,
    idCliente: number,
    options: {
      page?: number
      limit?: number
      order?: 'asc' | 'desc'
      tipo?: 'CREDITO' | 'DEBITO' | 'ESTORNO'
      origem?: string
      dt_ini?: string
      dt_fim?: string
    } = {}
  ): Promise<{
    data: Array<{
      id_movimentacao: number
      id_cliente: number
      tipo: 'CREDITO' | 'DEBITO' | 'ESTORNO'
      pontos: number
      saldo_resultante: number
      origem: string
      id_loja?: number
      id_item_recompensa?: number | null
      observacao?: string | null
      dt_cadastro: string
      usu_cadastro: number
    }>
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> => {
    const clienteId = normalizeClienteId(idCliente)
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.order) params.append('order', options.order)
    if (options.tipo) params.append('tipo', options.tipo)
    if (options.origem) params.append('origem', options.origem)
    if (options.dt_ini) params.append('dt_ini', options.dt_ini)
    if (options.dt_fim) params.append('dt_fim', options.dt_fim)

    // Usa API v2 agora que o endpoint foi criado
    return request<{
      data: Array<{
        id_movimentacao: number
        id_cliente: number
        tipo: 'CREDITO' | 'DEBITO' | 'ESTORNO'
        pontos: number
        saldo_resultante: number
        origem: string
        id_loja?: number
        id_item_recompensa?: number | null
        observacao?: string | null
        dt_cadastro: string
        usu_cadastro: number
      }>
      pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
      }
    }>(`/clientes/${schema}/${clienteId}/pontos-movimentacoes?${params.toString()}`)
  },
}
