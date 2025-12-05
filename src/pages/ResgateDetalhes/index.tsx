import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Snackbar,
  Typography,
  Alert,
  Chip,
} from '@mui/material'
import {
  ArrowBack,
  Person,
  Email,
  Phone,
  Event,
  CreditCard,
  CardGiftcard,
  CheckCircle,
  Schedule,
  Inventory2,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clienteService } from '../../services/clientes'
import { getTenantSchema } from '../../utils/schema'
import { formatTelefoneWhatsApp, getWhatsAppLink } from '../../utils/masks'
import './style.css'

interface DetalhesResgate {
  id_resgate: number
  codigo_resgate: string
  resgate_utilizado: boolean
  id_cliente: number
  id_item_recompensa: number
  id_movimentacao: number | null
  dt_resgate: string
  dt_utilizado: string | null
  cliente: {
    id_cliente: number
    nome: string
    email: string
    whatsapp: string
    saldo: number
  }
  item: {
    id_item_recompensa: number
    nome: string
    descricao: string | null
    quantidade_pontos: number
    nao_retirar_loja: boolean
  }
  movimentacao: {
    pontos: number
    saldo_resultante: number
    observacao: string | null
    dt_cadastro: string
  }
  status: 'pendente' | 'entregue'
}

const ResgateDetalhesPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const schema = getTenantSchema()

  const [resgate, setResgate] = useState<DetalhesResgate | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({
    open: false,
    message: '',
  })

  useEffect(() => {
    if (!id) {
      navigate('/dashboard')
      return
    }

    const loadResgate = async () => {
      try {
        setLoading(true)
        const resgateData = await clienteService.getDetalhesResgate(schema, parseInt(id))
        setResgate(resgateData)
      } catch (error: any) {
        console.error('Erro ao carregar resgate:', error)
        setToast({ open: true, message: error?.message || 'Erro ao carregar detalhes do resgate', severity: 'error' })
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadResgate()
  }, [id, schema, navigate])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!resgate) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          Voltar para Dashboard
        </Button>
        <Alert severity="error">Resgate não encontrado.</Alert>
      </Box>
    )
  }

  const statusConfig = {
    pendente: {
      label: 'Pendente',
      color: 'warning' as const,
      icon: Schedule,
    },
    entregue: {
      label: 'Entregue',
      color: 'success' as const,
      icon: CheckCircle,
    },
  }

  const status = statusConfig[resgate.status] || statusConfig.pendente
  const StatusIcon = status.icon

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
          Voltar
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              Detalhes do Resgate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resgate #{resgate.id_resgate}
            </Typography>
          </Box>
          <Chip
            icon={<StatusIcon />}
            label={status.label}
            color={status.color}
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      {/* Cards de Informações */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Informações do Cliente */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Informações do Cliente
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Person sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Nome
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {resgate.cliente.nome}
                    </Typography>
                  </Box>
                </Box>

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
                        if (resgate.cliente.email) {
                          navigator.clipboard.writeText(resgate.cliente.email)
                          setToast({ open: true, message: 'E-mail copiado!', severity: 'success' })
                        }
                      }}
                    >
                      {resgate.cliente.email || '—'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Phone sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      WhatsApp
                    </Typography>
                    <Typography
                      variant="body1"
                      component="a"
                      href={getWhatsAppLink(resgate.cliente.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {formatTelefoneWhatsApp(resgate.cliente.whatsapp)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <CreditCard sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Saldo Atual
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {resgate.cliente.saldo.toLocaleString('pt-BR')} pontos
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/clientes/${resgate.id_cliente}`)}
                    fullWidth
                  >
                    Ver detalhes do cliente
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações do Resgate */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CardGiftcard sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Informações do Resgate
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Inventory2 sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Item Resgatado
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {resgate.item.nome}
                    </Typography>
                    {resgate.item.descricao && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {resgate.item.descricao}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <CreditCard sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Pontos Utilizados
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      {resgate.movimentacao.pontos.toLocaleString('pt-BR')} pontos
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {resgate.codigo_resgate}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Código de Resgate
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                      {resgate.codigo_resgate}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                  <Event sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data e Hora do Resgate
                    </Typography>
                    <Typography variant="body1">
                      {resgate.dt_resgate && !isNaN(new Date(resgate.dt_resgate).getTime())
                        ? format(new Date(resgate.dt_resgate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : '—'}
                    </Typography>
                  </Box>
                </Box>

                {resgate.dt_utilizado && (
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <CheckCircle sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Data de Utilização
                      </Typography>
                      <Typography variant="body1">
                        {!isNaN(new Date(resgate.dt_utilizado).getTime())
                          ? format(new Date(resgate.dt_utilizado), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '—'}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {resgate.item.nao_retirar_loja && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Este item não precisa ser retirado na loja física.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default ResgateDetalhesPage

