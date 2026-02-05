import { adminApi } from './admin-api'

export type ConfiguracaoGlobal = {
  id_config_global: number
  logo_base64?: string
  cor_fundo?: string
  cor_card?: string
  cor_texto_card?: string
  cor_valor_card?: string
  cor_botao?: string
  cor_texto_botao?: string
  fonte_titulos?: string
  fonte_textos?: string
  arquivo_politica_privacidade?: string
  arquivo_termos_uso?: string
  dt_cadastro: string
  usu_cadastro: number
  dt_altera?: string | null
  usu_altera?: number | null
}

export type ConfiguracaoUpdate = {
  logo_base64?: string | null
  cor_fundo?: string
  cor_card?: string
  cor_texto_card?: string
  cor_valor_card?: string
  cor_botao?: string
  cor_texto_botao?: string
  fonte_titulos?: string
  fonte_textos?: string
  arquivo_politica_privacidade?: string | null
  arquivo_termos_uso?: string | null
}

export type ConfiguracaoCreate = {
  logo_base64?: string
  cor_fundo?: string
  cor_card?: string
  cor_texto_card?: string
  cor_valor_card?: string
  cor_botao?: string
  cor_texto_botao?: string
  fonte_titulos?: string
  fonte_textos?: string
  arquivo_politica_privacidade?: string
  arquivo_termos_uso?: string
  usu_cadastro: number
}

export type ListConfiguracoesResponse = {
  total: number
  itens: ConfiguracaoGlobal[]
}

const list = (schema: string, filters?: { limit?: number; offset?: number }, apiOptions?: { skipAuth?: boolean }) => {
  const params = new URLSearchParams()
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())
  const query = params.toString()
  return adminApi.get<ListConfiguracoesResponse>(
    `/${schema}/configuracoes-globais${query ? `?${query}` : ''}`,
    apiOptions
  )
}

const getById = (schema: string, id: number) =>
  adminApi.get<ConfiguracaoGlobal>(`/${schema}/configuracoes-globais/${id}`)

const getFirst = async (schema: string, apiOptions?: { skipAuth?: boolean }): Promise<ConfiguracaoGlobal | null> => {
  const response = await list(schema, { limit: 1, offset: 0 }, apiOptions)
  return response.itens.length > 0 ? response.itens[0] : null
}

const create = (schema: string, payload: ConfiguracaoCreate) =>
  adminApi.post<ConfiguracaoGlobal>(`/${schema}/configuracoes-globais`, payload)

const update = (schema: string, id: number, payload: ConfiguracaoUpdate) =>
  adminApi.put<ConfiguracaoGlobal>(`/${schema}/configuracoes-globais/${id}`, payload)

const remove = (schema: string, id: number) =>
  adminApi.delete<void>(`/${schema}/configuracoes-globais/${id}`)

export const configuracoesService = {
  list,
  getById,
  getFirst,
  create,
  update,
  remove,
}

