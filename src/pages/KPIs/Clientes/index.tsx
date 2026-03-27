import { useEffect, useState, useCallback } from 'react'
import { 
  Box, 
  Typography, 
  Grid, 
  Stack, 
  useTheme, 
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
  ListItemText,
  Paper,
  LinearProgress
} from '@mui/material'
import type { TransitionProps } from '@mui/material/transitions'
import React from 'react'
import {
  PeopleAltOutlined,
  PersonOffOutlined,
  RepeatOutlined,
  Close,
  FilterListOutlined,
  CalendarMonthOutlined,
  StoreOutlined,
  FaceOutlined,
  TimelineOutlined,
  DonutLargeOutlined
} from '@mui/icons-material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts'
import { KPICard } from '../../../components/dashboard/KPICard'
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

const AGE_COLORS = {
  '10-20 ANOS': '#2563eb',
  '21-30 ANOS': '#059669',
  '31-40 ANOS': '#d97706',
  '41-50 ANOS': '#ea580c',
  '51-60 ANOS': '#dc2626',
  '60+ ANOS': '#7c3aed'
}

const GENDER_COLORS = {
  'FEMININO': '#ec4899',
  'MASCULINO': '#2563eb',
  'OUTROS': '#64748b'
}

interface ClienteData {
  cards: {
    ativos: { value: number }
    inativos: { value: number }
    frequencia: { value: number }
    sexo: { sexo: string; count: number }[]
    faixa_etaria: { range: string; count: number }[]
  }
}

const DemographicCard = ({ title, icon: Icon, color, data, total, onClick }: any) => {
  const theme = useTheme()
  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 4,
        height: '100%',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'white',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)', borderColor: color }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          <Box sx={{ p: 1, borderRadius: '12px', background: `linear-gradient(135deg, ${color} 0%, ${theme.palette.action.disabled} 100%)`, color: 'white', display: 'flex' }}>
            <Icon />
          </Box>
        </Stack>

        <Stack spacing={2}>
          {data.map((item: any, idx: number) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0
            const label = item.range || (item.sexo === 'F' ? 'FEMININO' : item.sexo === 'M' ? 'MASCULINO' : 'OUTROS')
            const itemColor = (AGE_COLORS as any)[label] || (GENDER_COLORS as any)[label] || color

            return (
              <Box key={idx}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" fontWeight={800} sx={{ color: itemColor, fontSize: '0.75rem' }}>
                    {percentage.toFixed(1)}%
                  </Typography>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={percentage} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(0,0,0,0.05)',
                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: itemColor }
                  }} 
                />
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Card>
  )
}

// Subcomponent because of MUI Card conflict in same file if not careful
import { Card } from '@mui/material'

const ClienteKPIPage = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const tenantSchema = getTenantSchema()
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  
  const [data, setData] = useState<ClienteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lojas, setLojas] = useState<LojaDTO[]>([])
  const [lojasGestoras, setLojasGestoras] = useState<number[]>([])
  const [isLojaAdmin, setIsLojaAdmin] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const { user } = useAuth()
  
  // Filtros
  const [selectedLojas, setSelectedLojas] = useState<string[]>(['all'])
  const [selectedPeriod, setSelectedPeriod] = useState<number>(0)
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ lojaIds: ['all'], period: 0, startDate: '', endDate: '' })

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedKPI, setSelectedKPI] = useState<{ id: string; title: string, color: string } | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    setPlaceholder('Pesquisar em Clientes...')
    setQuery('')
    setFilters([])
  }, [setPlaceholder, setQuery, setFilters])

  useEffect(() => {
    const loadData = async () => {
      const schema = tenantSchema || getTenantSchema()
      if (!schema || !user) return
      
      try {
        // 1. Fetch user detail and groups
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
    if (!schema || isAuthLoading) return

    setLoading(true)
    try {
      let lojaIds: number[] | undefined = undefined
      if (!appliedFilters.lojaIds.includes('all')) {
        lojaIds = appliedFilters.lojaIds.map(Number)
      } else if (isLojaAdmin) {
        lojaIds = lojasGestoras.length > 0 ? lojasGestoras : [-1]
      }
      const response = await dashboardService.getClienteKPIs(schema, appliedFilters.period, lojaIds, appliedFilters.startDate, appliedFilters.endDate)
      setData(response)
    } catch (error) {
      console.error('Erro ao buscar dados de clientes:', error)
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
      
      const response = await dashboardService.getClienteStoresData(schema, id, appliedFilters.period, lojaIds, appliedFilters.startDate, appliedFilters.endDate)
      
      // Post-process demographic data if needed
      let processedData = response
      if (id === 'sexo' || id === 'faixa_etaria') {
        processedData = response.map((row: any) => {
          const counts = row.counts || {}
          const total = Object.values(counts).reduce((acc: number, cur: any) => acc + Number(cur), 0)
          const percentages: any = { label: row.label, total }
          Object.keys(counts).forEach(key => {
            percentages[key] = total > 0 ? Math.round((Number(counts[key]) / total) * 100) : 0
          })
          return percentages
        })
      }
      
      setChartData(Array.isArray(processedData) ? processedData : [])
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  const totalAge = data?.cards.faixa_etaria.reduce((acc, cur) => acc + cur.count, 0) || 0
  const totalGender = data?.cards.sexo.reduce((acc, cur) => acc + cur.count, 0) || 0

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1600px', margin: '0 auto' }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4, letterSpacing: '-0.02em', color: 'text.primary' }}>
        KPIs de Clientes
      </Typography>

      {/* Filtros */}
      <Paper elevation={0} sx={{ 
        p: 2, 
        mb: 4, 
        borderRadius: 4, 
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(52, 152, 219, 0.1)', color: '#3498db', display: 'flex' }}>
                <StoreOutlined fontSize="small" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Lojas:</Typography>
              <Select
                multiple
                value={selectedLojas}
                onChange={(e) => {
                  const value = e.target.value as string[]
                  if (value.includes('all') && value[value.length - 1] !== 'all') {
                    setSelectedLojas(value.filter(v => v !== 'all'))
                  } else if (value[value.length - 1] === 'all') {
                    setSelectedLojas(['all'])
                  } else {
                    setSelectedLojas(value.length === 0 ? ['all'] : value)
                  }
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.includes('all') ? (
                      <Chip label="Todas as Lojas" size="small" sx={{ borderRadius: '6px', fontWeight: 600 }} />
                    ) : (
                      selected.map((value) => {
                        const loja = lojas.find(l => l.id_loja === Number(value))
                        return <Chip key={value} label={loja?.nome_loja || value} size="small" sx={{ borderRadius: '6px', fontWeight: 600 }} />
                      })
                    )}
                  </Box>
                )}
                sx={{ flex: 1, height: '48px', borderRadius: '10px' }}
              >
                <MenuItem value="all">
                  <Checkbox checked={selectedLojas.includes('all')} />
                  <ListItemText primary="Todas as Lojas" sx={{ '& .MuiTypography-root': { fontWeight: 600 } }} />
                </MenuItem>
                {lojas.map((loja) => (
                  <MenuItem key={loja.id_loja || Math.random()} value={(loja.id_loja || '').toString()}>
                    <Checkbox checked={selectedLojas.includes((loja.id_loja || '').toString())} />
                    <ListItemText primary={loja.nome_loja} />
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', display: 'flex' }}>
                <CalendarMonthOutlined fontSize="small" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Período:</Typography>
              <Select
                value={selectedPeriod}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setSelectedPeriod(val)
                  if (val === -1) setCustomDateModalOpen(true)
                }}
                sx={{ flex: 1, height: '48px', borderRadius: '10px' }}
              >
                <MenuItem value={7}>Últimos 7 dias</MenuItem>
                <MenuItem value={30}>Últimos 30 dias</MenuItem>
                <MenuItem value={90}>Últimos 90 dias</MenuItem>
                <MenuItem value={365}>Último ano</MenuItem>
                <MenuItem value={0}>Todo o período</MenuItem>
                <MenuItem value={-1}>Personalizado...</MenuItem>
              </Select>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleApplyFilters}
              startIcon={<FilterListOutlined />}
              sx={{ 
                height: '48px', 
                borderRadius: '10px', 
                textTransform: 'none', 
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              Aplicar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Cards de Indicadores */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <KPICard
            title="Clientes Ativos"
            value={(data?.cards.ativos.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('ativos', 'Clientes Ativos por Loja', '#10b981')}
            icon={
              <Box sx={{ p: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                <PeopleAltOutlined />
              </Box>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <KPICard
            title="Clientes Inativos"
            value={(data?.cards.inativos.value || 0).toLocaleString()}
            loading={loading}
            onClick={() => handleCardClick('inativos', 'Clientes Inativos por Loja', '#ef4444')}
            icon={
              <Box sx={{ p: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                <PersonOffOutlined />
              </Box>
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <KPICard
            title="Frequência Média"
            value={data?.cards.frequencia.value || 0}
            loading={loading}
            onClick={() => handleCardClick('frequencia', 'Frequência Média por Loja', '#3b82f6')}
            icon={
              <Box sx={{ p: 1, borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
                <RepeatOutlined />
              </Box>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DemographicCard
            title="Perfil de Idade"
            icon={TimelineOutlined}
            color="#8b5cf6"
            data={data?.cards.faixa_etaria || []}
            total={totalAge}
            onClick={() => handleCardClick('faixa_etaria', 'Distribuição por Faixa Etária', '#8b5cf6')}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DemographicCard
            title="Distribuição por Sexo"
            icon={DonutLargeOutlined}
            color="#ec4899"
            data={data?.cards.sexo || []}
            total={totalGender}
            onClick={() => handleCardClick('sexo', 'Distribuição por Sexo', '#ec4899')}
          />
        </Grid>
      </Grid>

      {/* Modal - Stacked Bar Chart */}
      <Dialog
        fullScreen
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f8f9fc'
          }
        }}
      >
        <AppBar elevation={0} sx={{ position: 'relative', bgcolor: selectedKPI?.color || theme.palette.primary.main, boxShadow: 'none' }}>
          <Toolbar sx={{ height: 80 }}>
            <IconButton edge="start" color="inherit" onClick={() => setModalOpen(false)} aria-label="close" sx={{ bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              <Close />
            </IconButton>
            <Box sx={{ ml: 3 }}>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.5rem' }} variant="h5">
                {selectedKPI?.title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500, letterSpacing: '0.02em' }}>
                PERÍODO: {appliedFilters.period === 0 ? 'TODO O TEMPO' : `ÚLTIMOS ${appliedFilters.period} DIAS`}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
        
        <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', overflowY: 'auto' }}>
          <Box sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: 6, 
            p: { xs: 2, md: 5 }, 
            minHeight: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${theme.palette.divider}`,
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', letterSpacing: '-0.04em', mb: 1 }}>
                  Consolidado por Unidade
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Comparativo entre as {chartData.length} unidades selecionadas
                </Typography>
              </Box>
            </Stack>

            {chartLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                <CircularProgress size={60} thickness={5} sx={{ color: selectedKPI?.color }} />
              </Box>
            ) : chartData.length > 0 ? (
              <Box sx={{ height: Math.max(chartData.length * 40, 400), width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 80, left: isMobile ? 100 : 180, bottom: 10 }}
                    barGap={0}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide domain={selectedKPI?.id === 'sexo' || selectedKPI?.id === 'faixa_etaria' ? [0, 100] : ['auto', 'auto']} />
                    <YAxis 
                      dataKey="label" 
                      type="category" 
                      width={isMobile ? 100 : 180}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: theme.palette.text.primary, fontSize: 13, fontWeight: 700 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        padding: '12px 20px',
                        fontWeight: 700
                      }}
                      formatter={(val: any, name: string | undefined) => {
                        const isPercent = selectedKPI?.id === 'sexo' || selectedKPI?.id === 'faixa_etaria';
                        return [`${val}${isPercent ? '%' : ''}`, name || ''];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="center" 
                      wrapperStyle={{ paddingBottom: '40px', fontWeight: 700 }}
                    />
                    
                    {/* Render bars dynamically based on keys */}
                    {Object.keys(selectedKPI?.id === 'sexo' ? GENDER_COLORS : selectedKPI?.id === 'faixa_etaria' ? AGE_COLORS : { 'value': selectedKPI?.color })
                      .map((key) => {
                        const isDemographic = selectedKPI?.id === 'sexo' || selectedKPI?.id === 'faixa_etaria';
                        return (
                          <Bar 
                            key={key}
                            dataKey={key === 'value' ? 'value' : key}
                            stackId={isDemographic ? "a" : undefined}
                            fill={(AGE_COLORS as any)[key] || (GENDER_COLORS as any)[key] || selectedKPI?.color}
                            barSize={20}
                            radius={isDemographic ? 0 : [0, 10, 10, 0]}
                          >
                            {isDemographic && (
                              <LabelList 
                                dataKey={key} 
                                position="center"
                                content={(props: any) => {
                                  const { x, y, width, height, value } = props;
                                  if (!value || value < 5) return null;
                                  return (
                                    <text 
                                      x={x + width / 2} 
                                      y={y + height / 2} 
                                      fill="#fff" 
                                      textAnchor="middle" 
                                      dominantBaseline="middle" 
                                      style={{ fontSize: 12, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      {value}%
                                    </text>
                                  );
                                }}
                              />
                            )}
                            {!isDemographic && (
                              <LabelList 
                                dataKey="value" 
                                position="right" 
                                offset={10}
                                style={{ fill: theme.palette.text.primary, fontWeight: 900, fontSize: 13, fontFamily: 'Outfit, sans-serif' }}
                                formatter={(val: any) => val}
                              />
                            )}
                          </Bar>
                        );
                      })
                    }
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', opacity: 0.4 }}>
                <FaceOutlined sx={{ fontSize: 100, mb: 3 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Sem dados para exibir</Typography>
                <Typography variant="body2">Tente ajustar o período ou as lojas selecionadas</Typography>
              </Box>
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

export default ClienteKPIPage
