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

export type LojaRankingClientes = {
  id_loja: number
  nome_loja: string
  quantidade: number
  posicao: number
}

export type DashboardResponse = {
  clientes_total: number
  clientes_7d: number
  clientes_7d_variacao: number
  pontos_creditados_7d: number
  pontos_resgatados_7d: number
  itens_resgatados_7d: number
  lojas_ranking_novos_clientes: LojaRankingClientes[]
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

const getChartData = (schema: string, kpi: string, periodDays: number, lojaIds?: number[]) => {
  let params = `?kpi=${kpi}&period=${periodDays}`
  if (lojaIds && lojaIds.length > 0) {
    params += `&idLoja=${lojaIds.join(',')}`
  }
  return adminApi.get<any[]>(`/${schema}/dashboard/charts${params}`)
}

const getFidelidadeKPIs = (schema: string, periodDays: number = 30, lojaIds?: number[], startDate?: string, endDate?: string) => {
  let params = `?period=${periodDays}`
  if (lojaIds && lojaIds.length > 0) {
    params += `&idLoja=${lojaIds.join(',')}`
  }
  if (startDate && endDate) {
    params += `&startDate=${startDate}&endDate=${endDate}`
  }
  return adminApi.get<any>(`/${schema}/dashboard/fidelidade${params}`)
}

const getFidelidadeStoresData = (schema: string, kpi: string, periodDays: number = 0, lojaIds?: number[], startDate?: string, endDate?: string) => {
  let params = `?kpi=${kpi}&period=${periodDays}`
  if (lojaIds && lojaIds.length > 0) {
    params += `&idLoja=${lojaIds.join(',')}`
  }
  if (startDate && endDate) {
    params += `&startDate=${startDate}&endDate=${endDate}`
  }
  return adminApi.get<any[]>(`/${schema}/dashboard/fidelidade/stores${params}`)
}

export const dashboardService = {
  getDashboard,
  getChartData,
  getFidelidadeKPIs,
  getFidelidadeStoresData,
  getClienteKPIs: (schema: string, periodDays: number = 30, lojaIds?: number[] | string[], startDate?: string, endDate?: string) => {
    const lojas = Array.isArray(lojaIds) ? lojaIds.join(',') : lojaIds
    let params = `?period=${periodDays}`
    if (lojas) {
      params += `&idLoja=${lojas}`
    }
    if (startDate && endDate) {
      params += `&startDate=${startDate}&endDate=${endDate}`
    }
    return adminApi.get<any>(`/${schema}/dashboard/clientes${params}`)
  },
  getClienteStoresData: (schema: string, kpi: string, periodDays: number = 0, lojaIds?: number[] | string[], startDate?: string, endDate?: string) => {
    const lojas = Array.isArray(lojaIds) ? lojaIds.join(',') : lojaIds
    let params = `?kpi=${kpi}&period=${periodDays}`
    if (lojas) {
      params += `&idLoja=${lojas}`
    }
    if (startDate && endDate) {
      params += `&startDate=${startDate}&endDate=${endDate}`
    }
    return adminApi.get<any[]>(`/${schema}/dashboard/clientes/stores${params}`)
  },
  getMapData: (schema: string, lojaIds: number[]) => {
    return adminApi.get<{
      lojas: { id_loja: number; nome_loja: string; endereco_completo: string }[]
      clientes: { cep: string; total: number }[]
    }>(`/${schema}/dashboard/mapa?idLoja=${lojaIds.join(',')}`)
  },
}

