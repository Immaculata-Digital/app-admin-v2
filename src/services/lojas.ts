import { adminApi } from './admin-api'

export type LojaDTO = {
  id_loja?: number
  nome_loja: string
  numero_identificador: string
  nome_responsavel: string
  telefone_responsavel: string
  cnpj: string
  endereco_completo: string
  dt_cadastro?: string
  usu_cadastro: number
  dt_altera?: string | null
  usu_altera?: number | null
}

export type CreateLojaPayload = {
  nome_loja: string
  numero_identificador: string
  nome_responsavel: string
  telefone_responsavel: string
  cnpj: string
  endereco_completo: string
  usu_cadastro?: number
}

export type UpdateLojaPayload = {
  nome_loja?: string
  numero_identificador?: string
  nome_responsavel?: string
  telefone_responsavel?: string
  cnpj?: string
  endereco_completo?: string
  usu_altera?: number | null
}

export type ListLojasResponse = {
  total: number
  itens: LojaDTO[]
}

const list = (schema: string, filters?: { limit?: number; offset?: number; search?: string }) => {
  const params = new URLSearchParams()
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())
  if (filters?.search) params.append('search', filters.search)
  const query = params.toString()
  return adminApi.get<ListLojasResponse>(`/${schema}/lojas${query ? `?${query}` : ''}`)
}

const getById = (schema: string, id: number) => adminApi.get<LojaDTO>(`/${schema}/lojas/${id}`)
const create = (schema: string, payload: CreateLojaPayload) => adminApi.post<LojaDTO>(`/${schema}/lojas`, payload)
const update = (schema: string, id: number, payload: UpdateLojaPayload) => adminApi.put<LojaDTO>(`/${schema}/lojas/${id}`, payload)
const remove = (schema: string, id: number) => adminApi.delete<void>(`/${schema}/lojas/${id}`)

export const lojaService = {
  list,
  getById,
  create,
  update,
  remove,
}

