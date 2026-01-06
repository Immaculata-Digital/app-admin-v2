import { api } from './api'
import { getTenantSchema } from '../utils/schema'

export type FeatureDefinition = {
  key: string
  name: string
  description: string
}

export type AccessGroupDTO = {
  id: string
  name: string
  code: string
  features: string[]
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export type CreateAccessGroupPayload = {
  name: string
  code: string
  features: string[]
  createdBy: string
}

export type UpdateAccessGroupPayload = {
  name?: string
  code?: string
  features?: string[]
  updatedBy: string
}

// Helper para obter headers com schema
const getSchemaHeaders = () => {
  const schema = getTenantSchema()
  return { 'X-Schema': schema }
}

const list = () => api.get<AccessGroupDTO[]>('/groups', { headers: getSchemaHeaders() })
const create = (payload: CreateAccessGroupPayload) => api.post<AccessGroupDTO>('/groups', payload, { headers: getSchemaHeaders() })
const update = (id: string, payload: UpdateAccessGroupPayload) =>
  api.put<AccessGroupDTO>(`/groups/${id}`, payload, { headers: getSchemaHeaders() })
const remove = (id: string) => api.delete<void>(`/groups/${id}`, { headers: getSchemaHeaders() })
const listFeatures = () => api.get<FeatureDefinition[]>('/features')

export const accessGroupService = {
  list,
  create,
  update,
  remove,
  listFeatures,
}

