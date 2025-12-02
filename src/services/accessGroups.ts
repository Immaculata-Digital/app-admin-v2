import { api } from './api'

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

const list = () => api.get<AccessGroupDTO[]>('/groups')
const create = (payload: CreateAccessGroupPayload) => api.post<AccessGroupDTO>('/groups', payload)
const update = (id: string, payload: UpdateAccessGroupPayload) =>
  api.put<AccessGroupDTO>(`/groups/${id}`, payload)
const remove = (id: string) => api.delete<void>(`/groups/${id}`)
const listFeatures = () => api.get<FeatureDefinition[]>('/features')

export const accessGroupService = {
  list,
  create,
  update,
  remove,
  listFeatures,
}

