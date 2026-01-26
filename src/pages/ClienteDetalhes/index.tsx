import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Pagination,
  Stack,
} from '@mui/material'
import {
  ArrowBack,
  Person,
  Email,
  Phone,
  Event,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Refresh,
  Add,
  Remove,
  Store,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clienteService, type ClienteDTO } from '../../services/clientes'
import { getTenantSchema } from '../../utils/schema'
import { formatTelefoneWhatsApp, getWhatsAppLink } from '../../utils/masks'
import { lojaService } from '../../services/lojas'
import { authService } from '../../services/auth'
import TableCard, { type TableCardColumn, type TableCardRow } from '../../components/TableCard'
import './style.css'

interface Movimentacao {
  id_movimentacao: number
  id_cliente: number
  tipo: 'CREDITO' | 'DEBITO' | 'ESTORNO'
  pontos: number
  saldo_resultante: number
  origem: string
  id_loja?: number
  id_item_recompensa?: number | null
  observacao?: string | null
  dt_cadastro: string
  usu_cadastro: number
}

type MovimentacaoRow = TableCardRow & Movimentacao

const ClienteDetalhesPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const schema = getTenantSchema()

  const [cliente, setCliente] = useState<ClienteDTO | null>(null)
  const [lojas, setLojas] = useState<Array<{ id: number; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRow[]>([])
  const [page, setPage] = useState(1)
  const [totalMovimentacoes, setTotalMovimentacoes] = useState(0)
  const [tabValue, setTabValue] = useState(0)
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false)
  const [codigoResgate, setCodigoResgate] = useState('')
  const [creditData, setCreditData] = useState<{ valor_reais: number; valor_display: string }>({
    valor_reais: 0,
    valor_display: '',
  })
  const [isCreditando, setIsCreditando] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({
    open: false,
    message: '',
  })

  useEffect(() => {
    const loadLojas = async () => {
      try {
        const response = await lojaService.list(schema, { limit: 200, offset: 0 })
        setLojas(response.itens.map((loja) => ({ id: loja.id_loja ?? 0, label: loja.nome_loja })))
      } catch (err) {
        console.error('Erro ao carregar lojas:', err)
      }
    }
    loadLojas()
  }, [schema])


  useEffect(() => {
    if (!id) {
      navigate('/clientes')
      return
    }

    const loadCliente = async () => {
      try {
        setLoading(true)
        const clienteData = await clienteService.getById(schema, parseInt(id))
        setCliente(clienteData)
      } catch (error: any) {
        console.error('Erro ao carregar cliente:', error)
        setToast({ open: true, message: error?.message || 'Erro ao carregar cliente', severity: 'error' })
        navigate('/clientes')
      } finally {
        setLoading(false)
      }
    }

    loadCliente()
  }, [id, schema, navigate])

  useEffect(() => {
    if (!cliente) return

    const loadMovimentacoes = async () => {
      try {
        setLoadingMovimentacoes(true)
        const response = await clienteService.getMovimentacoes(schema, cliente.id_cliente, {
          page,
          limit: 10,
          order: 'desc',
        })
        setMovimentacoes(response.data.map((m) => ({ id: m.id_movimentacao, ...m })))
        setTotalMovimentacoes(response.pagination.total)
      } catch (error: any) {
        console.error('Erro ao carregar movimentações:', error)
        setToast({ open: true, message: error?.message || 'Erro ao carregar movimentações', severity: 'error' })
        setMovimentacoes([])
        setTotalMovimentacoes(0)
      } finally {
        setLoadingMovimentacoes(false)
      }
    }

    loadMovimentacoes()
  }, [cliente, schema, page])

  // Helper para buscar o nome da loja (usado fora do useMemo)
  const getNomeLoja = (idLoja: number | undefined): string => {
    if (!idLoja) return '-'
    const loja = lojas.find(l => l.id === idLoja)
    return loja?.label || '-'
  }

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

  const handleCreditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!cliente || !creditData.valor_reais || creditData.valor_reais <= 0) {
      return
    }

    setIsCreditando(true)
    try {
      // Obter id_loja do usuário logado do localStorage (concordia_user)
      const user = authService.getUser()
      const idLoja = user?.id_loja

      console.log('[ClienteDetalhes] Creditando pontos - localStorage:', {
        userFromStorage: user,
        idLojaFromStorage: idLoja,
        clienteIdLoja: cliente.id_loja
      })

      // Sempre usar o id_loja do localStorage do usuário logado
      await clienteService.creditarPontos(schema, cliente.id_cliente, {
        valor_reais: creditData.valor_reais,
        origem: 'MANUAL',
        id_loja: idLoja, // Usa o id_loja do localStorage (concordia_user)
        observacao: 'Acréscimo por compra do cliente',
      })
      setToast({ open: true, message: 'Pontos creditados com sucesso!', severity: 'success' })
      setIsCreditModalOpen(false)
      setCreditData({ valor_reais: 0, valor_display: '' })
      // Recarregar cliente e movimentações
      const clienteData = await clienteService.getById(schema, cliente.id_cliente)
      setCliente(clienteData)
      // Recarregar movimentações
      const response = await clienteService.getMovimentacoes(schema, cliente.id_cliente, {
        page: 1,
        limit: 10,
        order: 'desc',
      })
      setMovimentacoes(response.data.map((m) => ({ id: m.id_movimentacao, ...m })))
      setTotalMovimentacoes(response.pagination.total)
      setPage(1)
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao creditar pontos', severity: 'error' })
    } finally {
      setIsCreditando(false)
    }
  }

  const handleDebitSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!cliente || !codigoResgate || codigoResgate.length !== 5) {
      setToast({ open: true, message: 'Código deve ter exatamente 5 caracteres', severity: 'error' })
      return
    }

    try {
      // Obter id_loja do usuário logado do localStorage (concordia_user)
      const user = authService.getUser()
      const idLoja = user?.id_loja

      console.log('[ClienteDetalhes] Marcando código como utilizado - localStorage:', {
        userFromStorage: user,
        idLojaFromStorage: idLoja,
        clienteIdLoja: cliente.id_loja
      })

      // Sempre usar o id_loja do localStorage do usuário logado
      await clienteService.marcarCodigoComoUtilizado(schema, cliente.id_cliente, codigoResgate.trim(), idLoja)
      setToast({ open: true, message: 'Código marcado como utilizado com sucesso!', severity: 'success' })
      setIsDebitModalOpen(false)
      setCodigoResgate('')
      // Recarregar movimentações
      const response = await clienteService.getMovimentacoes(schema, cliente.id_cliente, {
        page,
        limit: 10,
        order: 'desc',
      })
      setMovimentacoes(response.data.map((m) => ({ id: m.id_movimentacao, ...m })))
      setTotalMovimentacoes(response.pagination.total)
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao marcar código como utilizado', severity: 'error' })
    }
  }

  const movimentacoesColumns: TableCardColumn<MovimentacaoRow>[] = useMemo(() => {
    // Helper para buscar o nome da loja (dentro do useMemo para evitar problemas de closure)
    const getNomeLoja = (idLoja: number | undefined): string => {
      if (!idLoja) return '-'
      const loja = lojas.find(l => l.id === idLoja)
      return loja?.label || '-'
    }

    return [
      {
        key: 'dt_cadastro',
        label: 'Data',
        render: (value) => {
          if (!value) return '—'
          const date = new Date(value)
          return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })
        },
      },
      {
        key: 'tipo',
        label: 'Tipo',
        render: (value) => {
          const tipoConfig = {
            CREDITO: {
              label: 'Crédito',
              icon: TrendingUp,
              color: 'success.main',
            },
            DEBITO: {
              label: 'Débito',
              icon: TrendingDown,
              color: 'error.main',
            },
            ESTORNO: {
              label: 'Estorno',
              icon: Refresh,
              color: 'warning.main',
            },
          }
          const config = tipoConfig[value as keyof typeof tipoConfig]
          if (!config) return value
          const Icon = config.icon
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon sx={{ fontSize: 18, color: config.color }} />
              <Typography variant="body2" sx={{ color: config.color }}>
                {config.label}
              </Typography>
            </Box>
          )
        },
      },
      {
        key: 'pontos',
        label: 'Pontos',
        render: (value, row) => {
          const pontos = Number(value)
          const isCredito = row.tipo === 'CREDITO' || row.tipo === 'ESTORNO'
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isCredito ? 'success.main' : 'error.main',
              }}
            >
              {isCredito ? '+' : '-'}
              {pontos.toLocaleString('pt-BR')}
            </Typography>
          )
        },
      },
      {
        key: 'saldo_resultante',
        label: 'Saldo Resultante',
        render: (value) => {
          const saldo = Number(value || 0)
          return <Typography variant="body2">{saldo.toLocaleString('pt-BR')}</Typography>
        },
      },
      {
        key: 'origem',
        label: 'Origem',
        render: (value) => {
          const origemLabels: Record<string, string> = {
            MANUAL: 'Manual',
            RESGATE: 'Resgate',
            AJUSTE: 'Ajuste',
            PROMO: 'Promoção',
            OUTRO: 'Outro',
          }
          return origemLabels[value] || value
        },
      },
      {
        key: 'id_loja',
        label: 'Loja',
        render: (_value, row) => {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2">
                {getNomeLoja(row.id_loja)}
              </Typography>
            </Box>
          )
        },
      },
      {
        key: 'observacao',
        label: 'Observação',
        render: (value) => value || '—',
      },
    ]
  }, [lojas])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!cliente) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/clientes')} sx={{ mb: 2 }}>
          Voltar para Clientes
        </Button>
        <Alert severity="error">Cliente não encontrado.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/clientes')} sx={{ mb: 2 }}>
          Voltar
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              {cliente.nome_completo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detalhes do Cliente
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<Add />}
              onClick={() => {
                setCreditData({ valor_reais: 0, valor_display: '' })
                setIsCreditModalOpen(true)
              }}
            >
              Acrescentar Pontos
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Remove />}
              onClick={() => {
                setCodigoResgate('')
                setIsDebitModalOpen(true)
              }}
            >
              Utilizar Pontos
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Cards de Informações */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CreditCard sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                  Saldo de Pontos
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {cliente.saldo.toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                pontos disponíveis
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Event sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                  Cliente desde
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                {cliente.dt_cadastro && !isNaN(new Date(cliente.dt_cadastro).getTime())
                  ? format(new Date(cliente.dt_cadastro), 'MMM/yy', { locale: ptBR })
                  : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                data de cadastro
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                  Status
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Ativo
              </Typography>
              <Typography variant="caption" color="text.secondary">
                conta ativa
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Dados Cadastrais" />
            <Tab label="Histórico" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Informações Pessoais
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Person sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Nome
                      </Typography>
                      <Typography variant="body1">{cliente.nome_completo}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Email sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        E-mail
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => {
                          if (cliente.email) {
                            navigator.clipboard.writeText(cliente.email)
                            setToast({ open: true, message: 'E-mail copiado!', severity: 'success' })
                          }
                        }}
                      >
                        {cliente.email || '—'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Phone sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        WhatsApp
                      </Typography>
                      <Typography
                        variant="body1"
                        component="a"
                        href={getWhatsAppLink(cliente.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {formatTelefoneWhatsApp(cliente.whatsapp)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Event sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Data de Cadastro
                      </Typography>
                      <Typography variant="body1">
                        {cliente.dt_cadastro && !isNaN(new Date(cliente.dt_cadastro).getTime())
                          ? format(new Date(cliente.dt_cadastro), 'dd/MM/yyyy', { locale: ptBR })
                          : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Store sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Loja de Cadastro
                      </Typography>
                      <Typography variant="body1">
                        {getNomeLoja(cliente.id_loja)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Histórico de Transações
              </Typography>
              {loadingMovimentacoes ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : movimentacoes.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma transação encontrada
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <TableCard
                    title=""
                    rows={movimentacoes}
                    columns={movimentacoesColumns}
                  />
                  {totalMovimentacoes > 10 && (
                    <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
                      <Pagination
                        count={Math.ceil(totalMovimentacoes / 10)}
                        page={page}
                        onChange={(_, newPage) => setPage(newPage)}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                      <Typography variant="body2" color="text.secondary">
                        Mostrando {movimentacoes.length} de {totalMovimentacoes} transações
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Card>

      {/* Credit Modal */}
      <Dialog open={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Acrescentar Pontos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cliente: <strong>{cliente?.nome_completo}</strong> • Saldo atual:{' '}
            <strong>{cliente?.saldo ?? 0} pts</strong>
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
              <Button onClick={() => setIsCreditModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                disabled={!creditData.valor_reais || creditData.valor_reais <= 0 || isCreditando}
              >
                {isCreditando ? 'Creditando...' : 'Creditar Pontos'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Debit Modal */}
      <Dialog open={isDebitModalOpen} onClose={() => setIsDebitModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Utilizar Pontos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cliente: <strong>{cliente?.nome_completo}</strong> • Saldo atual:{' '}
            <strong>{cliente?.saldo} pts</strong>
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
                color="error"
                disabled={!codigoResgate || codigoResgate.length !== 5}
              >
                Marcar como Utilizado
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast */}
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
    </Box>
  )
}

export default ClienteDetalhesPage

