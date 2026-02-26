import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  People,
  TrendingUp,
  CardGiftcard,
  Error as ErrorIcon,
  QrCode,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KPICard } from '../../components/dashboard/KPICard'
import { SimpleTable } from '../../components/dashboard/SimpleTable'
import { RewardItemsCarousel } from '../../components/dashboard/RewardItemsCarousel'
import { formatTelefoneWhatsApp, getWhatsAppLink } from '../../utils/masks'
import { dashboardService, type DashboardResponse } from '../../services/dashboard'
import { clienteService, type Cliente, type CodigoResgateResponse } from '../../services/clientes'
import { getTenantSchema } from '../../utils/schema'
import { useUserLojasGestoras } from '../../hooks/useUserLojasGestoras'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/auth'
import { DashboardChartModal } from '../../components/dashboard/DashboardChartModal'
import './style.css'

const DashboardPage = () => {
  const navigate = useNavigate()
  const schema = getTenantSchema()
  const { lojasGestoras, isAdmLoja } = useUserLojasGestoras()
  const { permissions } = useAuth()

  const hasPermission = (permission: string) => permissions.includes(permission)

  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para o modal de gráfico
  const [isChartModalOpen, setIsChartModalOpen] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<{ kpi: string, title: string }>({ kpi: '', title: '' })

  const openChartModal = (kpi: string, title: string) => {
    setSelectedKpi({ kpi, title })
    setIsChartModalOpen(true)
  }

  // Estados para busca de código
  const [codigoBusca, setCodigoBusca] = useState('')
  const [isBuscandoCodigo, setIsBuscandoCodigo] = useState(false)
  const [codigoClienteBusca, setCodigoClienteBusca] = useState('')
  const [isBuscandoCliente, setIsBuscandoCliente] = useState(false)
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false)
  const [codigoResgate, setCodigoResgate] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [codigoEncontrado, setCodigoEncontrado] = useState<CodigoResgateResponse | null>(null)
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [clienteParaCredito, setClienteParaCredito] = useState<Cliente | null>(null)
  const [creditData, setCreditData] = useState<{ valor_reais: number; valor_display: string }>({
    valor_reais: 0,
    valor_display: '',
  })
  const [isCreditando, setIsCreditando] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({
    open: false,
    message: '',
  })

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      // Se o usuário for ADM-LOJA e tiver lojas gestoras, filtrar por todas as lojas
      const lojaIds = isAdmLoja && lojasGestoras && lojasGestoras.length > 0
        ? lojasGestoras
        : undefined

      const dashboardData = await dashboardService.getDashboard(schema, lojaIds)
      setData(dashboardData)
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err)
      setError(err.message || 'Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [schema, isAdmLoja, lojasGestoras])

  const formatCurrency = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    const amount = parseFloat(numbers) / 100
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const handleCurrencyChange = (value: string) => {
    const formatted = formatCurrency(value)
    const numericValue = parseFloat(formatted.replace(/\./g, '').replace(',', '.'))
    setCreditData({
      valor_display: formatted,
      valor_reais: isNaN(numericValue) ? 0 : numericValue,
    })
  }

  const handleBuscarCodigo = async () => {
    if (!codigoBusca || codigoBusca.trim().length !== 5) {
      setToast({ open: true, message: 'Código deve ter exatamente 5 caracteres', severity: 'error' })
      return
    }

    setIsBuscandoCodigo(true)
    try {
      const resultado = await clienteService.buscarCodigoResgate(schema, codigoBusca.trim())

      if (resultado.resgate_utilizado) {
        setToast({ open: true, message: 'Este código já foi utilizado', severity: 'error' })
        return
      }

      const cliente: Cliente = {
        id_cliente: resultado.id_cliente,
        nome: resultado.cliente_nome || '',
        email: '',
        telefone: '',
        saldo_pontos: resultado.cliente_saldo || 0,
        id_loja: null,
        nome_loja: null,
      }

      setSelectedCliente(cliente)
      setCodigoResgate(resultado.codigo_resgate)
      setCodigoEncontrado(resultado)
      setIsDebitModalOpen(true)
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('não encontrado')) {
        setToast({ open: true, message: 'Código de resgate não encontrado', severity: 'error' })
      } else {
        setToast({ open: true, message: error?.message || 'Erro ao buscar código de resgate', severity: 'error' })
      }
    } finally {
      setIsBuscandoCodigo(false)
    }
  }

  const handleDebitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCliente || !codigoResgate || codigoResgate.trim().length !== 5) {
      setToast({ open: true, message: 'Código deve ter exatamente 5 caracteres', severity: 'error' })
      return
    }

    try {
      // Obter id_loja do usuário logado do localStorage (concordia_user)
      const user = authService.getUser()
      const idLoja = user?.id_loja

      console.log('[Dashboard] Marcando código como utilizado - localStorage:', {
        userFromStorage: user,
        idLojaFromStorage: idLoja,
        clienteIdLoja: selectedCliente.id_loja
      })

      // Sempre usar o id_loja do localStorage do usuário logado
      await clienteService.marcarCodigoComoUtilizado(
        schema,
        selectedCliente.id_cliente,
        codigoResgate.trim(),
        idLoja
      )

      setToast({ open: true, message: 'Código marcado como utilizado com sucesso!', severity: 'success' })

      setIsDebitModalOpen(false)
      setCodigoResgate('')
      setCodigoBusca('')
      setSelectedCliente(null)
      setCodigoEncontrado(null)
      loadDashboard()
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao marcar código como utilizado', severity: 'error' })
    }
  }

  const resetCreditModal = () => {
    setIsCreditModalOpen(false)
    setCreditData({ valor_reais: 0, valor_display: '' })
    setClienteParaCredito(null)
  }

  const handleCreditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clienteParaCredito || !creditData.valor_reais || creditData.valor_reais <= 0) {
      return
    }

    setIsCreditando(true)
    try {
      // Obter id_loja do usuário logado do localStorage (concordia_user)
      const user = authService.getUser()
      const idLoja = user?.id_loja

      console.log('[Dashboard] Creditando pontos - localStorage:', {
        userFromStorage: user,
        idLojaFromStorage: idLoja,
        clienteIdLoja: clienteParaCredito.id_loja
      })

      // Sempre usar o id_loja do localStorage do usuário logado
      await clienteService.creditarPontos(schema, clienteParaCredito.id_cliente, {
        valor_reais: creditData.valor_reais,
        origem: 'MANUAL',
        id_loja: idLoja, // Usa o id_loja do localStorage (concordia_user)
        observacao: 'Acréscimo por compra do cliente',
      })
      setCodigoClienteBusca('')
      resetCreditModal()
      setToast({ open: true, message: 'Pontos creditados com sucesso!', severity: 'success' })
      loadDashboard()
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao creditar pontos', severity: 'error' })
    } finally {
      setIsCreditando(false)
    }
  }

  const handleBuscarCliente = async () => {
    if (!codigoClienteBusca.trim()) {
      setToast({ open: true, message: 'Informe o código do cliente ou celular', severity: 'error' })
      return
    }

    setIsBuscandoCliente(true)
    try {
      let parametro = codigoClienteBusca.trim()
      const apenasNumeros = parametro.replace(/\D/g, '')
      // Se digitou apenas números e tem menos de 10 dígitos, assume que é o ID (CLI-)
      if (apenasNumeros === parametro && parametro.length > 0 && parametro.length < 10) {
        parametro = `CLI-${parametro}`
      }

      const cliente = await clienteService.getByCodigo(schema, parametro)
      setClienteParaCredito(cliente)
      setCreditData({ valor_reais: 0, valor_display: '' })
      setIsCreditModalOpen(true)
    } catch (error: any) {
      if (error?.status === 404) {
        setToast({ open: true, message: 'Cliente não encontrado. Verifique se o código ou celular está correto.', severity: 'error' })
      } else {
        setToast({ open: true, message: error?.message || 'Não foi possível buscar o cliente', severity: 'error' })
      }
    } finally {
      setIsBuscandoCliente(false)
    }
  }

  if (error && !data) {
    return (
      <Box className="dashboard-page">
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px" gap={2}>
          <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
          <Typography variant="h6" color="error">
            Não foi possível carregar os dados do dashboard.
          </Typography>
          <Button variant="contained" onClick={loadDashboard}>
            Tentar novamente
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box className="dashboard-page" sx={{ p: 3 }}>
      {/* Busca de Código */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {hasPermission('erp:dashboard:acrescentar-pontos') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card className="glass-effect">
              <CardContent>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <People sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500} sx={{ color: 'success.main' }}>
                      Acrescentar pontos ao Cliente
                    </Typography>
                  </Box>
                  <Box>
                    <TextField
                      value={codigoClienteBusca}
                      onChange={(e) => setCodigoClienteBusca(e.target.value)}
                      fullWidth
                      placeholder="CLI-123 ou (41) 99999-9999"
                      disabled={isBuscandoCliente}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleBuscarCliente()
                        }
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          textAlign: 'center',
                          fontSize: '1.125rem',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em',
                        },
                      }}
                    />
                    <Button
                      onClick={handleBuscarCliente}
                      disabled={!codigoClienteBusca || isBuscandoCliente}
                      fullWidth
                      variant="contained"
                      sx={{
                        mt: 1,
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                      }}
                    >
                      {isBuscandoCliente ? 'Consultando...' : 'Acrescentar Pontos'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
        {hasPermission('erp:dashboard:consultar-codigo-resgate') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card className="glass-effect">
              <CardContent>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <QrCode sx={{ color: 'error.main', fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500} sx={{ color: 'error.main' }}>
                      Consultar Código de Resgate
                    </Typography>
                  </Box>
                  <Box>
                    <TextField
                      value={codigoBusca}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
                        setCodigoBusca(value)
                      }}
                      fullWidth
                      placeholder="Digite o código"
                      inputProps={{ maxLength: 5 }}
                      disabled={isBuscandoCodigo}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleBuscarCodigo()
                        }
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          textAlign: 'center',
                          fontSize: '1.125rem',
                          fontFamily: 'monospace',
                          letterSpacing: '0.1em',
                        },
                      }}
                    />
                    <Button
                      onClick={handleBuscarCodigo}
                      disabled={!codigoBusca || codigoBusca.length !== 5 || isBuscandoCodigo}
                      fullWidth
                      variant="contained"
                      sx={{
                        mt: 1,
                        bgcolor: 'error.main',
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      {isBuscandoCodigo ? 'Consultando...' : 'Utilizar Pontos'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* KPIs Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {hasPermission('erp:dashboard:card-total-clientes') && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPICard
              title="Itens Resgatados"
              value={data?.itens_resgatados_7d.toLocaleString('pt-BR') || '0'}
              subtitle="Últimos 7 dias"
              loading={loading}
              onClick={() => openChartModal('itens-resgatados', 'Ranking de Itens Resgatados')}
              icon={<CardGiftcard sx={{ fontSize: 24 }} />}
            />
          </Grid>
        )}

        {hasPermission('erp:dashboard:card-novos-clientes') && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPICard
              title="Novos Clientes"
              value={data?.clientes_7d || 0}
              subtitle="Últimos 7 dias"
              variacao={data?.clientes_7d_variacao}
              onClick={() => openChartModal('novos-clientes', 'Histórico de Novos Clientes')}
              loading={loading}
              icon={<TrendingUp sx={{ fontSize: 24 }} />}
            />
          </Grid>
        )}

        {hasPermission('erp:dashboard:card-pontos-creditados') && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPICard
              title="Pontos Creditados"
              value={data?.pontos_creditados_7d.toLocaleString('pt-BR') || '0'}
              subtitle="Últimos 7 dias"
              loading={loading}
              onClick={() => openChartModal('pontos-creditados', 'Pontos Creditados por Período')}
              icon={<CardGiftcard sx={{ fontSize: 24 }} />}
            />
          </Grid>
        )}

        {hasPermission('erp:dashboard:card-pontos-resgatados') && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KPICard
              title="Pontos Resgatados"
              value={data?.pontos_resgatados_7d.toLocaleString('pt-BR') || '0'}
              subtitle="Últimos 7 dias"
              loading={loading}
              onClick={() => openChartModal('pontos-resgatados', 'Pontos Resgatados por Período')}
              icon={<CardGiftcard sx={{ fontSize: 24 }} />}
            />
          </Grid>
        )}
      </Grid>

      {/* Listas Rápidas */}
      <Grid container spacing={3}>
        {hasPermission('erp:dashboard:tabela-novos-clientes') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <SimpleTable
              title="Novos Clientes (7 dias)"
              data={data?.novos_clientes_7d || []}
              columns={[
                {
                  key: 'nome',
                  label: 'Nome',
                  render: (value) => (
                    <Typography variant="body2" fontWeight={500}>
                      {value}
                    </Typography>
                  ),
                },
                {
                  key: 'whatsapp',
                  label: 'WhatsApp',
                  render: (value) =>
                    value ? (
                      <Typography
                        component="a"
                        href={getWhatsAppLink(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'underline',
                          '&:hover': { color: 'primary.dark' },
                        }}
                      >
                        {formatTelefoneWhatsApp(value)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    ),
                },
                {
                  key: 'dt_cadastro',
                  label: 'Cadastro',
                  render: (value) => (
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(value), 'dd/MM/yy', { locale: ptBR })}
                    </Typography>
                  ),
                },
              ]}
              actions={{
                label: 'Ver',
                onClick: (item) => navigate(`/clientes/${item.id_cliente}`),
              }}
              emptyMessage="Nenhum cliente cadastrado no período."
              loading={loading}
            />
          </Grid>
        )}

        {hasPermission('erp:dashboard:tabela-ultimos-resgates') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <SimpleTable
              title="Últimos Resgates"
              data={(data?.ultimos_resgates || []).slice(0, 3)}
              columns={[
                {
                  key: 'cliente_nome',
                  label: 'Cliente',
                  render: (value) => (
                    <Typography variant="body2" fontWeight={500}>
                      {value}
                    </Typography>
                  ),
                },
                {
                  key: 'item_nome',
                  label: 'Item',
                  render: (value) => (
                    <Typography variant="body2" color="text.secondary">
                      {value}
                    </Typography>
                  ),
                },
                {
                  key: 'pontos',
                  label: 'Pontos',
                  render: (value) => (
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {value}
                    </Typography>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (value) => {
                    const statusMap: Record<string, { color: 'success' | 'info' | 'error' | 'warning' | 'default'; label: string }> = {
                      pendente: { color: 'warning', label: 'Pendente' },
                      aprovado: { color: 'info', label: 'Aprovado' },
                      entregue: { color: 'success', label: 'Entregue' },
                      rejeitado: { color: 'error', label: 'Rejeitado' },
                    }
                    const status = statusMap[value as string] || { color: 'default' as const, label: value as string }
                    return (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: `${status.color}.light`,
                          color: `${status.color}.main`,
                          fontWeight: 500,
                        }}
                      >
                        {status.label}
                      </Typography>
                    )
                  },
                },
              ]}
              actions={{
                label: 'Ver',
                onClick: (item) => navigate(`/resgates/${item.id_resgate}`),
              }}
              emptyMessage="Nenhum resgate no período."
              loading={loading}
            />
          </Grid>
        )}
      </Grid>

      {/* Carrossel de Itens de Recompensa */}
      {hasPermission('erp:itens-recompensa:listar') && (
        <Box sx={{ mt: 3 }}>
          <RewardItemsCarousel />
        </Box>
      )}

      {/* Credit Points Modal */}
      <Dialog open={isCreditModalOpen} onClose={resetCreditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Acrescentar Pontos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cliente: <strong>{clienteParaCredito?.nome}</strong> • Saldo atual:{' '}
            <strong>{clienteParaCredito?.saldo_pontos ?? 0} pts</strong>
          </Typography>
          <form onSubmit={handleCreditSubmit}>
            <TextField
              label="Valor gasto (R$)"
              value={creditData.valor_display}
              onChange={(event) => handleCurrencyChange(event.target.value)}
              placeholder="0,00"
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            {creditData.valor_reais > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Serão creditados <strong>{Math.floor(creditData.valor_reais * 10)} pontos</strong>
              </Typography>
            )}
            <DialogActions>
              <Button onClick={resetCreditModal}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!creditData.valor_reais || creditData.valor_reais <= 0 || isCreditando}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                {isCreditando ? 'Creditando...' : 'Creditar Pontos'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Debit Points Modal */}
      <Dialog open={isDebitModalOpen} onClose={() => setIsDebitModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Usar Créditos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cliente: <strong>{selectedCliente?.nome}</strong> • Saldo atual:{' '}
            <strong>{selectedCliente?.saldo_pontos} pts</strong>
            {codigoEncontrado?.item_nome && (
              <> • Item: <strong>{codigoEncontrado.item_nome}</strong></>
            )}
          </Typography>
          <form onSubmit={handleDebitSubmit}>
            <TextField
              label="Código de Resgate"
              value={codigoResgate}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
                setCodigoResgate(value)
              }}
              placeholder="Digite o código de 5 caracteres"
              inputProps={{ maxLength: 5 }}
              fullWidth
              required
              sx={{
                mb: 1,
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  fontSize: '1.125rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Digite o código de resgate gerado para marcar como utilizado
            </Typography>
            <DialogActions>
              <Button onClick={() => setIsDebitModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!codigoResgate || codigoResgate.length !== 5}
              >
                Marcar como Utilizado
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast/Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <DashboardChartModal
        open={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        title={selectedKpi.title}
        kpi={selectedKpi.kpi}
        schema={schema}
        lojaIds={isAdmLoja && lojasGestoras && lojasGestoras.length > 0 ? lojasGestoras : undefined}
      />
    </Box>
  )
}

export default DashboardPage
