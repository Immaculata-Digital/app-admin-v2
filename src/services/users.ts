import { api } from './api'

export type UserDTO = {
  id: string
  fullName: string
  login: string
  email: string
  groupIds: string[]
  allowFeatures: string[]
  deniedFeatures: string[]
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
  createdBy: string
}

export type UpdateUserPayload = {
  fullName?: string
  login?: string
  email?: string
  groupIds?: string[]
  allowFeatures?: string[]
  deniedFeatures?: string[]
  updatedBy: string
}

export type UpdateUserBasicPayload = {
  fullName: string
  login: string
  email: string
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

const list = () => api.get<UserDTO[]>('/users')
const create = (payload: CreateUserPayload) => api.post<UserDTO>('/users', payload)
const update = (id: string, payload: UpdateUserPayload) => api.put<UserDTO>(`/users/${id}`, payload)
const updateBasic = (id: string, payload: UpdateUserBasicPayload) => api.put<UserDTO>(`/users/${id}/basic`, payload)
const updateGroups = (id: string, payload: UpdateUserGroupsPayload) => api.put<UserDTO>(`/users/${id}/groups`, payload)
const updatePermissions = (id: string, payload: UpdateUserPermissionsPayload) => api.put<UserDTO>(`/users/${id}/permissions`, payload)
const remove = (id: string) => api.delete<void>(`/users/${id}`)
const resetPassword = (payload: { token: string; password: string; confirmPassword: string }) =>
  api.post<void>('/users/password/reset', payload, { skipAuth: true })

const requestPasswordReset = (email: string) =>
  api.post<{ status: string; message: string }>('/users/password/reset-request', { email })

export const userService = {
  list,
  create,
  update,
  updateBasic,
  updateGroups,
  updatePermissions,
  remove,
  resetPassword,
  requestPasswordReset,
}

