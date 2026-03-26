import { useEffect, useState, useCallback } from 'react'
import { 
  Box, 
  Typography, 
  Grid, 
  Stack, 
  useTheme, 
  Card, 
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  useMediaQuery,
  AppBar,
  Toolbar,
  Slide,
  MenuItem,
  Select,
  Button,
  Chip,
  Checkbox,
  ListItemText
} from '@mui/material'
import type { TransitionProps } from '@mui/material/transitions'
import React from 'react'
import {
  PeopleAltOutlined,
  AttachMoneyOutlined,
  StarsOutlined,
  CardGiftcardOutlined,
  StoreOutlined,
  ReceiptOutlined,
  Close,
  FilterListOutlined,
  CalendarMonthOutlined
} from '@mui/icons-material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'
import { KPICard } from '../../../components/dashboard/KPICard'
import TableCard, { type TableCardColumn } from '../../../components/TableCard'
import { dashboardService } from '../../../services/dashboard'
import { lojaService, type LojaDTO } from '../../../services/lojas'
import { useSearch } from '../../../context/SearchContext'
import { getTenantSchema } from '../../../utils/schema'
import { userService } from '../../../services/users'
import { accessGroupService } from '../../../services/accessGroups'
import { useAuth } from '../../../context/AuthContext'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

interface Resgate {
  id: number | string
  id_resgate: number
  cliente_nome: string
  item_nome: string
  pontos: number
  data: string
  loja_nome: string
}

interface FidelidadeData {
  cards: {
    clientes: { value: number; variacao?: number }
    vendas: { value: number; variacao?: number }
    ticket_medio: { value: number; variacao?: number }
    pontos_creditados: { value: number; variacao?: number }
    pontos_resgatados: { value: number; variacao?: number }
  }
  ultimos_resgates: Resgate[]
}

interface ChartData {
  label: string
  value: number
}

const FidelidadeKPIPage = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const tenantSchema = getTenantSchema()
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  
  const [data, setData] = useState<FidelidadeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lojas, setLojas] = useState<LojaDTO[]>([])
  const [lojasGestoras, setLojasGestoras] = useState<number[]>([])
  const [isLojaAdmin, setIsLojaAdmin] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const { user } = useAuth()
  
  // States for filters
  const [selectedLojas, setSelectedLojas] = useState<string[]>(['all'])
  const [selectedPeriod, setSelectedPeriod] = useState<number>(0)
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  
  // Real filters applied to the data fetching
  const [appliedFilters, setAppliedFilters] = useState({ lojaIds: ['all'], period: 0, startDate: '', endDate: '' })

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKPI, setSelectedKPI] = useState<{ id: string; title: string; color: string } | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    setFilters([
      { id: 'item_nome', label: 'Item/Prêmio', field: 'item_nome', type: 'text' as const },
      { id: 'loja_nome', label: 'Loja', field: 'loja_nome', type: 'text' as const },
    ], 'item_nome')
    setPlaceholder('Buscar resgate...')

    return () => {
      setFilters([])
      setPlaceholder('Pesquisar...')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  // Load user details and lojas
  useEffect(() => {
    const loadData = async () => {
      const schema = tenantSchema || getTenantSchema()
      if (!schema || !user) return
      
      try {
        // 1. Fetch user detail and groups to check for ADM-LOJA role
        const userDetail = await userService.getById(user.id)
        const allGroups = await accessGroupService.list()
        const userGroups = allGroups.filter(g => (userDetail.groupIds || []).includes(g.id))
        
        // Flexible check for ADM-LOJA role
        const isLojistaRole = userGroups.some(g => {
          const name = g.name.toUpperCase()
          return name === 'ADM-LOJA' || name === 'ADM_LOJA' || name.includes('ADMINISTRADOR DE LOJA')
        })
        const managedIds = userDetail.lojasGestoras || []
        
        // Determine if restricted based on role or if they have managed stores but aren't global admins
        const isRestricted = isLojistaRole || (managedIds.length > 0 && !userGroups.some(g => {
          const name = g.name.toUpperCase()
          return name === 'ADM-TECH' || name === 'ADM-FRANQUIA'
        }))
        
        setIsLojaAdmin(isRestricted)
        setLojasGestoras(managedIds)

        // 2. Fetch lojas list
        const response = await lojaService.list(schema, { limit: 100 })
        let allLojas = response.itens || []
        
        // 3. APPLY FILTER IF RESTRICTED
        if (isRestricted) {
          allLojas = allLojas.filter(l => l.id_loja && managedIds.includes(l.id_loja))
        }
        
        setLojas(allLojas)
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error)
      } finally {
        setIsAuthLoading(false)
      }
    }
    loadData()
  }, [tenantSchema, user])

  const fetchData = useCallback(async () => {
    const schema = tenantSchema || getTenantSchema()
    if (!schema) return
    
    try {
      setLoading(true)
      // Logic for ADM-LOJA: if "all" is selected, send only managed stores. If not ADM-LOJA, send undefined (all).
      let lojaIds: number[] | undefined = undefined
      if (!appliedFilters.lojaIds.includes('all')) {
        lojaIds = appliedFilters.lojaIds.map(Number)
      } else if (isLojaAdmin) {
        lojaIds = lojasGestoras.length > 0 ? lojasGestoras : [-1] // Force empty result if no stores assigned
      }

      const response = await dashboardService.getFidelidadeKPIs(schema, appliedFilters.period, lojaIds, appliedFilters.startDate, appliedFilters.endDate)
      
      if (response && response.cards) {
        const mappedData: FidelidadeData = {
          ...response,
          ultimos_resgates: (response.ultimos_resgates || []).map((r: any) => ({
            ...r,
            id: r.id_resgate || Math.random().toString()
          }))
        }
        setData(mappedData)
      }
    } catch (error) {
      console.error('Erro ao buscar KPIs de Fidelidade:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantSchema, appliedFilters, isLojaAdmin, lojasGestoras, isAuthLoading])

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData()
    }
  }, [fetchData, isAuthLoading])

  const handleApplyFilters = () => {
    if (selectedPeriod === -1 && (!tempStartDate || !tempEndDate)) {
      setCustomDateModalOpen(true)
      return
    }
    setAppliedFilters({ lojaIds: selectedLojas, period: selectedPeriod, startDate: selectedPeriod === -1 ? tempStartDate : '', endDate: selectedPeriod === -1 ? tempEndDate : '' })
  }

  const handleCardClick = async (id: string, title: string, color: string) => {
    const schema = tenantSchema || getTenantSchema()
    if (!schema) return

    setSelectedKPI({ id, title, color })
    setModalOpen(true)
    setChartLoading(true)
    try {
      let lojaIds: number[] | undefined = undefined
      if (!appliedFilters.lojaIds.includes('all')) {
        lojaIds = appliedFilters.lojaIds.map(Number)
      } else if (isLojaAdmin) {
        lojaIds = lojasGestoras.length > 0 ? lojasGestoras : [-1]
      }
      
      const response = await dashboardService.getFidelidadeStoresData(schema, id, appliedFilters.period, lojaIds, appliedFilters.startDate, appliedFilters.endDate)
      setChartData(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  const handleLojaChange = (event: any) => {
    const value = event.target.value
    // Logic for "Todas as Lojas"
    if (value.includes('all')) {
      if (selectedLojas.includes('all') && value.length > 1) {
        // If "all" was already selected and user picked a store, remove "all"
        setSelectedLojas(value.filter((v: string) => v !== 'all'))
      } else {
        // If user explicitly picked "all", remove everything else
        setSelectedLojas(['all'])
      }
    } else {
      if (value.length === 0) {
        setSelectedLojas(['all'])
      } else {
        setSelectedLojas(value)
      }
    }
  }

  const columns: TableCardColumn<Resgate>[] = [
    {
      key: 'item_nome',
      label: 'ITEM / PRÊMIO',
      render: (value, row) => (
        <Box>
          <Typography variant="body1" fontWeight={600} sx={{ color: theme.palette.text.primary }}>
            {String(value || 'Sem nome')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: #{String(row?.id_resgate || '0').padStart(4, '0')}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'pontos',
      label: 'PONTOS',
      render: (value) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: 'rgba(156, 39, 176, 0.08)',
            color: 'secondary.main',
            px: 1.5,
            py: 0.5,
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <StarsOutlined sx={{ fontSize: 16, mr: 0.5 }} />
          {Number(value || 0).toLocaleString()} pts
        </Box>
      ),
    },
    {
      key: 'data',
      label: 'DATA',
      render: (value) => value ? new Date(String(value)).toLocaleDateString('pt-BR') : '--',
    },
    {
      key: 'loja_nome',
      label: 'LOJA',
      render: (value) => (
        <Stack direction="row" alignItems="center" spacing={1} color="text.secondary">
          <StoreOutlined sx={{ fontSize: 18 }} />
          <Typography variant="body2">{String(value || 'Loja não informada')}</Typography>
        </Stack>
      ),
    },
  ]

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4, letterSpacing: '-0.02em' }}>
        KPIs de Fidelidade
      </Typography>

      {/* Barra de Filtros */}
      <Card className="glass-effect" sx={{ mb: 3, borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={3} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1} color="primary.main">
                  <StoreOutlined sx={{ fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={700}>Unidades / Lojas</Typography>
                </Stack>
                <Select
                  multiple
                  fullWidth
                  size="small"
                  value={selectedLojas}
                  onChange={handleLojaChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.includes('all') ? (
                        <Chip size="small" label="Todas as Lojas" sx={{ fontWeight: 600 }} />
                      ) : (
                        selected.map((value) => (
                          <Chip 
                            key={value} 
                            size="small" 
                            label={lojas.find(l => String(l.id_loja) === value)?.nome_loja || value} 
                          />
                        ))
                      )}
                    </Box>
                  )}
                  sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                >
                  <MenuItem value="all">
                    <Checkbox checked={selectedLojas.includes('all')} />
                    <ListItemText primary="Todas as Lojas" />
                  </MenuItem>
                  {lojas.map((loja) => (
                    <MenuItem key={loja.id_loja} value={String(loja.id_loja)}>
                      <Checkbox checked={selectedLojas.includes(String(loja.id_loja))} />
                      <ListItemText primary={loja.nome_loja} />
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1} color="primary.main">
                  <CalendarMonthOutlined sx={{ fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={700}>Período</Typography>
                </Stack>
                <Select
                  fullWidth
                  size="small"
                  value={selectedPeriod}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setSelectedPeriod(val)
                    if (val === -1) setCustomDateModalOpen(true)
                  }}
                  sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                >
                  <MenuItem value={7}>Últimos 7 dias</MenuItem>
                  <MenuItem value={30}>Últimos 30 dias</MenuItem>
                  <MenuItem value={90}>Últimos 90 dias</MenuItem>
                  <MenuItem value={365}>Este ano</MenuItem>
                  <MenuItem value={0}>Histórico Completo</MenuItem>
                  <MenuItem value={-1}>Personalizado...</MenuItem>
                </Select>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterListOutlined />}
                onClick={handleApplyFilters}
                sx={{ 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Aplicar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <KPICard
            title="Ticket Médio"
            value={formatCurrency(data?.cards?.ticket_medio?.value || 0)}
            loading={loading}
            onClick={() => handleCardClick('ticket_medio', 'Ticket Médio por Loja', '#10b981')}
            icon={
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.3)',
                }}
              >
                <AttachMoneyOutlined sx={{ fontSize: 20 }} />
              </Box>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <KPICard
            title="Pontos Creditados"
            value={(data?.cards?.pontos_creditados?.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('pontos_creditados', 'Pontos Creditados por Loja', '#f59e0b')}
            icon={
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px -2px rgba(245, 158, 11, 0.3)',
                }}
              >
                <StarsOutlined sx={{ fontSize: 20 }} />
              </Box>
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPICard
            title="Quantidade de Vendas"
            value={(data?.cards?.vendas?.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('vendas', 'Quantidade de Vendas por Loja', '#3b82f6')}
            icon={
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.3)',
                }}
              >
                <ReceiptOutlined sx={{ fontSize: 20 }} />
              </Box>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPICard
            title="Cadastro de Clientes"
            value={(data?.cards?.clientes?.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('clientes', 'Novos Clientes por Loja', '#6366f1')}
            icon={
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.3)',
                }}
              >
                <PeopleAltOutlined sx={{ fontSize: 20 }} />
              </Box>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KPICard
            title="Pontos Resgatados"
            value={(data?.cards?.pontos_resgatados?.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('pontos_resgatados', 'Pontos Resgatados por Loja', '#ec4899')}
            icon={
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px -2px rgba(236, 72, 153, 0.3)',
                }}
              >
                <CardGiftcardOutlined sx={{ fontSize: 20 }} />
              </Box>
            }
          />
        </Grid>
      </Grid>

      <Card
        className="glass-effect"
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, pt: 3, pb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Últimos Itens Resgatados
            </Typography>
          </Box>
          <TableCard
            rows={data?.ultimos_resgates || []}
            columns={columns}
            disableActionsColumn
            disableSelection
            disableView
          />
        </CardContent>
      </Card>

      {/* Modal de Gráfico Tela Cheia */}
      <Dialog 
        fullScreen
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative', bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setModalOpen(false)}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" fontWeight={700}>
              {selectedKPI?.title || 'KPI por Loja'}
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: { xs: 2, md: 8 }, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 1200, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {chartLoading ? (
              <CircularProgress size={60} />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="label" 
                    angle={0} 
                    textAnchor="middle" 
                    height={40} 
                    interval={0}
                    tick={{ 
                      fontSize: 12, 
                      fontWeight: 700, 
                      fill: theme.palette.text.primary,
                      fontFamily: 'inherit'
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 13, fontWeight: 500, fill: theme.palette.text.secondary }} 
                    tickFormatter={(val) => selectedKPI?.id === 'ticket_medio' ? `R$${val}` : String(val)}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{ 
                      borderRadius: 16, 
                      border: 'none', 
                      boxShadow: theme.shadows[8],
                      fontWeight: 700,
                      padding: '12px 16px'
                    }}
                    formatter={(val: any) => [
                      selectedKPI?.id === 'ticket_medio' 
                        ? formatCurrency(Number(val)) 
                        : Number(val).toLocaleString(), 
                      'Total'
                    ]}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[10, 10, 0, 0]}
                    barSize={isMobile ? 40 : 80}
                  >
                     <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(val: any) => selectedKPI?.id === 'ticket_medio' ? `R$ ${Number(val).toFixed(2)}` : val}
                      style={{ fill: theme.palette.text.primary, fontWeight: 700, fontSize: 14 }}
                    />
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={selectedKPI?.color || theme.palette.primary.main} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="h6" color="text.secondary">
                Nenhum dado encontrado para as lojas selecionadas.
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog 
        open={customDateModalOpen} 
        onClose={() => setCustomDateModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Período Personalizado</Typography>
          <IconButton onClick={() => setCustomDateModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Data Inicial"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
            />
            <TextField
              label="Data Final"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setCustomDateModalOpen(false)} color="inherit" sx={{ fontWeight: 600, textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              if (tempStartDate && tempEndDate) {
                setCustomDateModalOpen(false)
                setAppliedFilters({ lojaIds: selectedLojas, period: -1, startDate: tempStartDate, endDate: tempEndDate })
              }
            }} 
            variant="contained" 
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 600, textTransform: 'none' }}
            disabled={!tempStartDate || !tempEndDate}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FidelidadeKPIPage
