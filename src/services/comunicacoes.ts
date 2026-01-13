// Removido import não utilizado

const API_COMUNICACOES_BASE_URL = import.meta.env.VITE_API_COMUNICACOES_URL ?? 'http://localhost:3336/api'

export type RemetenteSmtpDTO = {
  id_remetente: string
  nome: string
  email: string
  senha: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  dt_cadastro: string
  usu_cadastro: number
  dt_altera: string | null
  usu_altera: number | null
}

export type CreateRemetenteSmtpPayload = {
  nome: string
  email: string
  senha: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  usu_cadastro: number
}

export type UpdateRemetenteSmtpPayload = {
  nome?: string
  email?: string
  senha?: string
  smtp_host?: string
  smtp_port?: number
  smtp_secure?: boolean
  usu_altera: number
}

export type CampanhaDisparoDTO = {
  id_campanha: string
  tipo: 'email'
  descricao: string
  assunto: string
  html: string
  remetente_id: string
  tipo_envio: 'manual' | 'agendado' | 'boas_vindas' | 'atualizacao_pontos' | 'resgate' | 'reset_senha' | 'resgate_nao_retirar_loja'
  data_agendamento: string | null
  status: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'cancelada'
  total_enviados: number
  total_entregues: number
  total_abertos: number
  total_cliques: number
  chave: string
  tipo_destinatario: 'todos' | 'lojas_especificas' | 'clientes_especificos' | 'grupo_acesso'
  lojas_ids: string | null
  clientes_ids: string | null
  cliente_pode_excluir: boolean
  dt_cadastro: string
  usu_cadastro: number
  dt_altera: string | null
  usu_altera: number | null
}

export type CreateCampanhaDisparoPayload = {
  tipo: 'email'
  descricao: string
  assunto: string
  html: string
  remetente_id: string
  tipo_envio: 'manual' | 'agendado' | 'boas_vindas' | 'atualizacao_pontos' | 'resgate' | 'reset_senha' | 'resgate_nao_retirar_loja'
  data_agendamento?: string | null
  chave?: string
  tipo_destinatario?: 'todos' | 'lojas_especificas' | 'clientes_especificos' | 'grupo_acesso'
  lojas_ids?: string | null
  clientes_ids?: string | null
  cliente_pode_excluir?: boolean
  usu_cadastro: number
}

export type UpdateCampanhaDisparoPayload = {
  descricao?: string
  assunto?: string
  html?: string
  remetente_id?: string
  tipo_envio?: 'manual' | 'agendado' | 'boas_vindas' | 'atualizacao_pontos' | 'resgate' | 'reset_senha' | 'resgate_nao_retirar_loja'
  data_agendamento?: string | null
  status?: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'cancelada'
  tipo_destinatario?: 'todos' | 'lojas_especificas' | 'clientes_especificos' | 'grupo_acesso'
  lojas_ids?: string | null
  clientes_ids?: string | null
  cliente_pode_excluir?: boolean
  usu_altera: number
}

// Helper para fazer requisições à API de comunicações
const comunicacoesRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('concordia_access_token')
  
  try {
    const response = await fetch(`${API_COMUNICACOES_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    // Se receber 401, apenas lança erro sem fazer logoff automático
    // O erro será tratado pela página
    if (response.status === 401) {
      let message = 'Não autorizado'
      try {
        const data = await response.json()
        message = data?.message ?? message
      } catch {
        // ignore parse error
      }
      throw new Error(message)
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
      const error: any = new Error(message)
      error.status = response.status
      error.details = details
      throw error
    }

    if (response.status === 204) {
      return null as T
    }

    return (await response.json()) as T
  } catch (error) {
    // Se for erro de conexão (API não está rodando), lança erro específico
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Não foi possível conectar à API de comunicações. Verifique se o servidor está rodando.')
    }
    throw error
  }
}

// Remetentes SMTP
const listRemetentesSmtp = (schema: string) => 
  comunicacoesRequest<RemetenteSmtpDTO[]>(`/${schema}/remetentes-smtp`)
const getRemetenteSmtp = (schema: string, id: string) => 
  comunicacoesRequest<RemetenteSmtpDTO>(`/${schema}/remetentes-smtp/${id}`)
const createRemetenteSmtp = (schema: string, payload: CreateRemetenteSmtpPayload) =>
  comunicacoesRequest<RemetenteSmtpDTO>(`/${schema}/remetentes-smtp`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
const updateRemetenteSmtp = (schema: string, id: string, payload: UpdateRemetenteSmtpPayload) =>
  comunicacoesRequest<RemetenteSmtpDTO>(`/${schema}/remetentes-smtp/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
const deleteRemetenteSmtp = (schema: string, id: string) => 
  comunicacoesRequest<void>(`/${schema}/remetentes-smtp/${id}`, { method: 'DELETE' })

// Campanhas de Disparo
const listCampanhasDisparo = (schema: string) => 
  comunicacoesRequest<CampanhaDisparoDTO[]>(`/${schema}/campanhas-disparo`)
const getCampanhaDisparo = (schema: string, id: string) => 
  comunicacoesRequest<CampanhaDisparoDTO>(`/${schema}/campanhas-disparo/${id}`)
const createCampanhaDisparo = (schema: string, payload: CreateCampanhaDisparoPayload) =>
  comunicacoesRequest<CampanhaDisparoDTO>(`/${schema}/campanhas-disparo`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
const updateCampanhaDisparo = (schema: string, id: string, payload: UpdateCampanhaDisparoPayload) =>
  comunicacoesRequest<CampanhaDisparoDTO>(`/${schema}/campanhas-disparo/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
const deleteCampanhaDisparo = (schema: string, id: string) => 
  comunicacoesRequest<void>(`/${schema}/campanhas-disparo/${id}`, { method: 'DELETE' })
const enviarCampanhaDisparo = (schema: string, id: string, payload?: { anexos?: Array<{ nome: string; conteudo: string; tipo: string }> }) =>
  comunicacoesRequest<{ message: string; total_enviados: number }>(`/${schema}/campanhas-disparo/${id}/enviar`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const comunicacoesService = {
  remetentesSmtp: {
    list: listRemetentesSmtp,
    get: getRemetenteSmtp,
    create: createRemetenteSmtp,
    update: updateRemetenteSmtp,
    delete: deleteRemetenteSmtp,
  },
  campanhasDisparo: {
    list: listCampanhasDisparo,
    get: getCampanhaDisparo,
    create: createCampanhaDisparo,
    update: updateCampanhaDisparo,
    delete: deleteCampanhaDisparo,
    enviar: enviarCampanhaDisparo,
  },
}

