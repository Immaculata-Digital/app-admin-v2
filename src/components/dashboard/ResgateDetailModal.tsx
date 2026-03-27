import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
  Stack,
  useTheme,
  Alert
} from '@mui/material'
import {
  Close,
  Person,
  CardGiftcard,
  Store,
  Stars,
  Schedule,
  CheckCircle,
  Phone,
  Email,
  Inventory2
} from '@mui/icons-material'
import { clienteService } from '../../services/clientes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ResgateDetailModalProps {
  open: boolean
  onClose: () => void
  resgateId: number | null
  schema: string
}

export function ResgateDetailModal({ open, onClose, resgateId, schema }: ResgateDetailModalProps) {
  const theme = useTheme()
  const [loading, setLoading] = useState(false)
  const [resgate, setResgate] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && resgateId) {
      loadDetails()
    } else {
      setResgate(null)
      setError(null)
    }
  }, [open, resgateId, schema])

  const loadDetails = async () => {
    if (!resgateId) return
    try {
      setLoading(true)
      setError(null)
      const data = await clienteService.getDetalhesResgate(schema, resgateId)
      setResgate(data)
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do resgate:', err)
      setError(err?.message || 'Não foi possível carregar os detalhes do resgate.')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    pendente: { label: 'Pendente', color: 'warning' as const, icon: Schedule },
    entregue: { label: 'Entregue', color: 'success' as const, icon: CheckCircle },
  }

  const renderInfoItem = (icon: any, label: string, value: string | number, color?: string) => (
    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
      <Box sx={{ color: 'text.secondary', mt: 0.3 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={500} sx={{ color: color || 'text.primary' }}>
          {value || '—'}
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 3, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white'
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <CardGiftcard />
          <Typography variant="h6" fontWeight={700}>
            Detalhes do Resgate
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 300 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={3}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : resgate ? (
          <Box>
            {/* Status Header */}
            <Box p={3} sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Código de Resgate
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: 'primary.main' }}>
                    {resgate.codigo_resgate}
                  </Typography>
                </Box>
                <Chip 
                  label={statusConfig[resgate.status as keyof typeof statusConfig]?.label || resgate.status} 
                  color={statusConfig[resgate.status as keyof typeof statusConfig]?.color || 'default'}
                  icon={resgate.status === 'entregue' ? <CheckCircle /> : <Schedule />}
                  sx={{ fontWeight: 700, px: 1 }}
                />
              </Stack>
            </Box>

            <Box p={3}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Informações do Item
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    {renderInfoItem(<Inventory2 fontSize="small" />, "Item Resgatado", resgate.item.nome)}
                    {renderInfoItem(<Stars fontSize="small" />, "Pontos Utilizados", `${resgate.movimentacao.pontos.toLocaleString()} pts`, theme.palette.primary.main)}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Dados do Cliente
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    {renderInfoItem(<Person fontSize="small" />, "Nome do Cliente", resgate.cliente.nome)}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderInfoItem(<Phone fontSize="small" />, "WhatsApp", resgate.cliente.whatsapp || '—')}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderInfoItem(<Email fontSize="small" />, "E-mail", resgate.cliente.email || '—')}
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Local e Data
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderInfoItem(<Store fontSize="small" />, "Unidade / Loja", resgate.loja_nome || 'Unidade Principal')}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderInfoItem(<Schedule fontSize="small" />, "Data do Resgate", resgate.dt_resgate ? format(new Date(resgate.dt_resgate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—')}
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
