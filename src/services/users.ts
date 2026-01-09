import { api } from './api'
import { getTenantSchema } from '../utils/schema'

export type UserDTO = {
  id: string
  fullName: string
  login: string
  email: string
  groupIds: string[]
  allowFeatures: string[]
  deniedFeatures: string[]
  lojasGestoras?: number[]
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export type CreateUserPayload = {
  fullName: string
  login: string
  email: string
  password?: string
  groupIds?: string[]
  allowFeatures?: string[]
  deniedFeatures?: string[]
  lojasGestoras?: number[]
  createdBy: string
}

export type UpdateUserPayload = {
  fullName?: string
  login?: string
  email?: string
  groupIds?: string[]
  allowFeatures?: string[]
  deniedFeatures?: string[]
  lojasGestoras?: number[]
  updatedBy: string
}

export type UpdateUserBasicPayload = {
  fullName: string
  login: string
  email: string
  lojasGestoras?: number[]
  updatedBy: string
}

export type UpdateUserGroupsPayload = {
  groupIds: string[]
  updatedBy: string
}

export type UpdateUserPermissionsPayload = {
  allowFeatures: string[]
  deniedFeatures: string[]
  updatedBy: string
}

// Helper para obter headers com schema
const getSchemaHeaders = () => {
  const schema = getTenantSchema()
  return { 'X-Schema': schema }
}

const list = () => api.get<UserDTO[]>('/users', { headers: getSchemaHeaders() })
const getById = (id: string) => api.get<UserDTO>(`/users/${id}`, { headers: getSchemaHeaders() })
const create = (payload: CreateUserPayload) => api.post<UserDTO>('/users', payload, { headers: getSchemaHeaders() })
const update = (id: string, payload: UpdateUserPayload) => api.put<UserDTO>(`/users/${id}`, payload, { headers: getSchemaHeaders() })
const updateBasic = (id: string, payload: UpdateUserBasicPayload) => api.put<UserDTO>(`/users/${id}/basic`, payload, { headers: getSchemaHeaders() })
const updateGroups = (id: string, payload: UpdateUserGroupsPayload) => api.put<UserDTO>(`/users/${id}/groups`, payload, { headers: getSchemaHeaders() })
const updatePermissions = (id: string, payload: UpdateUserPermissionsPayload) => api.put<UserDTO>(`/users/${id}/permissions`, payload, { headers: getSchemaHeaders() })
const remove = (id: string) => api.delete<void>(`/users/${id}`, { headers: getSchemaHeaders() })
const resetPassword = (payload: { token: string; password: string; confirmPassword: string }) =>
  api.post<void>('/users/password/reset', payload, { skipAuth: true })

const requestPasswordReset = (email: string) =>
  api.post<{ status: string; message: string }>('/users/password/reset-request', { 
    email,
    web_url: window.location.origin // URL base do front-end
  })

export const userService = {
  list,
  getById,
  create,
  update,
  updateBasic,
  updateGroups,
  updatePermissions,
  remove,
  resetPassword,
  requestPasswordReset,
}

