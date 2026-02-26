import { adminApi } from './admin-api'

export type DashboardCliente = {
  id_cliente: number
  nome: string
  email: string
  whatsapp?: string
  dt_cadastro: string
  pontos_saldo: number
}

export type DashboardResgate = {
  id_resgate: number
  id_cliente: number
  cliente_nome: string
  item_nome: string
  pontos: number
  dt_resgate: string
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'entregue'
}

export type DashboardResponse = {
  clientes_total: number
  clientes_7d: number
  clientes_7d_variacao: number
  pontos_creditados_7d: number
  pontos_resgatados_7d: number
  itens_resgatados_7d: number
  novos_clientes_7d: DashboardCliente[]
  ultimos_resgates: DashboardResgate[]
}

const getDashboard = (schema: string, lojaIds?: number[]) => {
  let params = ''
  if (lojaIds && lojaIds.length > 0) {
    // Se tiver múltiplas lojas, passar como vírgula separada
    params = `?idLoja=${lojaIds.join(',')}`
  }
  return adminApi.get<DashboardResponse>(`/${schema}/dashboard${params}`)
}

export const dashboardService = {
  getDashboard,
}

