import { api } from './api'

export interface MenuDefinition {
    key: string
    category: string
    name: string
    description: string
    url: string
    icon: string
    children?: MenuDefinition[]
}

export const menusService = {
    getAll: () => api.get<MenuDefinition[]>('/menus'),
}

