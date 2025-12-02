import { adminApi } from './admin-api'

export type ItemRecompensaDTO = {
  id_item_recompensa?: number
  nome_item: string
  descricao: string
  quantidade_pontos: number
  imagem_item?: string | null
  nao_retirar_loja: boolean
  dt_cadastro?: string
  usu_cadastro: number
  dt_altera?: string | null
  usu_altera?: number | null
}

export type CreateItemRecompensaPayload = {
  nome_item: string
  descricao: string
  quantidade_pontos: number
  imagem_item?: string | null
  nao_retirar_loja?: boolean
  usu_cadastro?: number
}

export type UpdateItemRecompensaPayload = {
  nome_item?: string
  descricao?: string
  quantidade_pontos?: number
  imagem_item?: string | null
  nao_retirar_loja?: boolean
  usu_altera?: number | null
}

export type ListItensRecompensaResponse = {
  total: number
  itens: ItemRecompensaDTO[]
}

const list = (schema: string, filters?: { limit?: number; offset?: number; search?: string }) => {
  const params = new URLSearchParams()
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())
  if (filters?.search) params.append('search', filters.search)
  const query = params.toString()
  return adminApi.get<ListItensRecompensaResponse>(`/${schema}/itens-recompensa${query ? `?${query}` : ''}`)
}

const getById = (schema: string, id: number) => adminApi.get<ItemRecompensaDTO>(`/${schema}/itens-recompensa/${id}`)
const create = (schema: string, payload: CreateItemRecompensaPayload) => adminApi.post<ItemRecompensaDTO>(`/${schema}/itens-recompensa`, payload)
const update = (schema: string, id: number, payload: UpdateItemRecompensaPayload) => adminApi.put<ItemRecompensaDTO>(`/${schema}/itens-recompensa/${id}`, payload)
const remove = (schema: string, id: number) => adminApi.delete<void>(`/${schema}/itens-recompensa/${id}`)

export const itemRecompensaService = {
  list,
  getById,
  create,
  update,
  remove,
}

