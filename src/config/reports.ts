import type { GridColDef } from '@mui/x-data-grid'

export interface ReportFilterConfig {
    name: string
    label: string
    type: 'date' | 'select' | 'loja_select' | 'text'
    required?: boolean
}

export interface ReportConfig {
    id: string
    name: string
    description: string
    permissionKey: string
    endpoint: string
    filters: ReportFilterConfig[]
    columns: GridColDef[]
}

export const reportsConfig: ReportConfig[] = [
    {
        id: 'historico-compras',
        name: 'Histórico de Compras - Fidelidade',
        description: 'Relatório detalhado das compras, créditos e débitos de pontos dos clientes do programa de fidelidade.',
        permissionKey: 'erp:relatorios:historico-compras:gerar',
        endpoint: '/relatorios/historico-compras',
        filters: [
            {
                name: 'id_loja',
                label: 'Loja',
                type: 'loja_select',
                required: false
            },
            {
                name: 'dataInicial',
                label: 'Data Inicial',
                type: 'date',
                required: false
            },
            {
                name: 'dataFinal',
                label: 'Data Final',
                type: 'date',
                required: false
            }
        ],
        columns: [
            { field: 'cliente_concordia', headerName: 'Tenant', width: 120 },
            { field: 'cliente_nome', headerName: 'Cliente', flex: 1 },
            { field: 'email', headerName: 'Email', flex: 1 },
            { field: 'whatsapp', headerName: 'WhatsApp', width: 150 },
            { field: 'Data', headerName: 'Data', width: 180 },
            { field: 'Operação', headerName: 'Operação', width: 120 },
            { field: 'Origem', headerName: 'Origem', width: 120 },
            { field: 'Pontos', headerName: 'Pontos', type: 'number', width: 100 },
            { field: 'Saldo', headerName: 'Saldo Resultante', type: 'number', width: 130 },
            { field: 'Loja', headerName: 'Loja', flex: 1 },
            { field: 'Item Resgatado', headerName: 'Item Resgatado', flex: 1 },
            { field: 'Observação', headerName: 'Observação', flex: 1 }
        ]
    }
]
