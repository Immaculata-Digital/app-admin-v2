import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  CircularProgress,
  Snackbar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from '@mui/material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
  type TableCardRowAction,
} from '../../components/TableCard'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import TextPicker from '../../components/TextPicker'
import SelectPicker from '../../components/SelectPicker'
import PhonePicker from '../../components/PhonePicker'
import CepPicker from '../../components/CepPicker'
import MailPicker from '../../components/MailPicker'
import { clienteService, type ClienteDTO, type CreateClientePayload, type UpdateClientePayload } from '../../services/clientes'
import { getTenantSchema } from '../../utils/schema'
import { lojaService } from '../../services/lojas'
import { useNavigate } from 'react-router-dom'
import { formatTelefoneBR } from '../../utils/masks'
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material'

type ClienteRow = TableCardRow & ClienteDTO

const ClientesPage = () => {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [lojas, setLojas] = useState<Array<{ id: number; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' })
  const [_error, setError] = useState<string | null>(null)
  
  // Point Modal States
  const [selectedCliente, setSelectedCliente] = useState<ClienteRow | null>(null)
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false)
  const [creditData, setCreditData] = useState<{ valor_reais: number; valor_display: string }>({ valor_reais: 0, valor_display: '' })
  const [codigoResgate, setCodigoResgate] = useState('')
  const [isProcessingPoints, setIsProcessingPoints] = useState(false)

  const { setFilters, setPlaceholder } = useSearch()
  const { permissions } = useAuth()
  const schema = getTenantSchema()

  const canDelete = permissions.includes('erp:clientes:excluir')
  const canEdit = permissions.includes('erp:clientes:editar')
  const canCreate = permissions.includes('erp:clientes:criar')
  const canView = permissions.includes('erp:clientes:visualizar')
  const canList = permissions.includes('erp:clientes:listar')

  useEffect(() => {
    setPlaceholder('Buscar clientes por nome ou email...')
    const filters = [
      { id: 'nome_completo', label: 'Nome Completo', field: 'nome_completo', type: 'text' as const, page: 'clientes' },
      { id: 'email', label: 'Email', field: 'email', type: 'text' as const, page: 'clientes' },
    ]
    setFilters(filters, 'nome_completo')
    return () => {
      setFilters([])
      setPlaceholder('')
    }
  }, [setFilters, setPlaceholder])

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

  const loadClientes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await clienteService.list(schema, { limit: 200, offset: 0 })
      setClientes(response.data.map(mapClienteToRow))
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar os clientes')
      setToast({ open: true, message: err.message || 'Erro ao carregar clientes', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [schema])

  useEffect(() => {
    loadClientes()
  }, [loadClientes])

  const mapClienteToRow = (cliente: ClienteDTO): ClienteRow => ({
    id: cliente.id_cliente,
    ...cliente,
  })

  // Point Transaction Handlers
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
    if (!selectedCliente || !creditData.valor_reais || creditData.valor_reais <= 0) return

    setIsProcessingPoints(true)
    try {
      await clienteService.creditarPontos(schema, selectedCliente.id_cliente, {
        valor_reais: creditData.valor_reais,
        origem: 'MANUAL',
        id_loja: selectedCliente.id_loja,
        observacao: 'Acréscimo manual via lista de clientes',
      })
      setToast({ open: true, message: 'Pontos creditados com sucesso!', severity: 'success' })
      setIsCreditModalOpen(false)
      loadClientes()
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao creditar pontos', severity: 'error' })
    } finally {
      setIsProcessingPoints(false)
    }
  }

  const handleDebitSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCliente || !codigoResgate || codigoResgate.length !== 5) return

    setIsProcessingPoints(true)
    try {
      await clienteService.marcarCodigoComoUtilizado(schema, selectedCliente.id_cliente, codigoResgate.trim())
      setToast({ open: true, message: 'Código utilizado com sucesso!', severity: 'success' })
      setIsDebitModalOpen(false)
      loadClientes()
    } catch (error: any) {
      setToast({ open: true, message: error?.message || 'Erro ao utilizar pontos', severity: 'error' })
    } finally {
      setIsProcessingPoints(false)
    }
  }


  const columns: TableCardColumn<ClienteRow>[] = useMemo(
    () => [
      { key: 'nome_completo', label: 'Nome Completo' },
      { key: 'email', label: 'Email' },
      { 
        key: 'whatsapp', 
        label: 'WhatsApp',
        render: (value) => formatTelefoneBR(value)
      },
      { 
        key: 'saldo', 
        label: 'Saldo de Pontos',
        render: (value) => value?.toLocaleString('pt-BR') || '0'
      },
      { 
        key: 'dt_cadastro', 
        label: 'Data Cadastro',
        render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : ''
      },
    ],
    []
  )

  const formFields: TableCardFormField<ClienteRow>[] = useMemo(
    () => [
      {
        key: 'id_loja',
        label: 'Loja',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <SelectPicker
            label="Loja"
            value={value ? String(value) : ''}
            onChange={(val) => onChange(val ? Number(val) : undefined)}
            options={lojas.map(l => ({ value: String(l.id), label: l.label }))}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'nome_completo',
        label: 'Nome Completo',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Nome Completo"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'email',
        label: 'Email',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <MailPicker
            label="Email"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <PhonePicker
            label="WhatsApp"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            placeholder="+55 (00) 0 0000-0000"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'cep',
        label: 'CEP',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <CepPicker
            label="CEP"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'sexo',
        label: 'Sexo',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <SelectPicker
            label="Sexo"
            value={typeof value === 'string' ? value : ''}
            onChange={(val) => onChange(val as 'M' | 'F' | undefined)}
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
            ]}
            fullWidth
            disabled={disabled}
          />
        ),
      },
    ],
    [lojas]
  )

  const handleCreate = useCallback(
    async (formData: Partial<ClienteRow>) => {
      try {
        const payload: CreateClientePayload = {
          id_loja: Number(formData.id_loja),
          nome_completo: formData.nome_completo || '',
          email: formData.email || '',
          whatsapp: formData.whatsapp || '',
          cep: formData.cep || '',
          sexo: (formData.sexo as 'M' | 'F') || 'M',
          aceite_termos: true,
          senha: '123456',
        }
        await clienteService.create(schema, payload)
        setToast({ open: true, message: 'Cliente criado com sucesso!', severity: 'success' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao criar cliente', severity: 'error' })
      }
    },
    [schema, loadClientes]
  )

  const handleUpdate = useCallback(
    async (id: ClienteRow['id'], formData: Partial<ClienteRow>) => {
      try {
        const payload: UpdateClientePayload = {
          id_loja: formData.id_loja ? Number(formData.id_loja) : undefined,
          nome_completo: formData.nome_completo,
          email: formData.email,
          whatsapp: formData.whatsapp,
          cep: formData.cep,
          sexo: formData.sexo as 'M' | 'F' | undefined,
        }
        await clienteService.update(schema, Number(id), payload)
        setToast({ open: true, message: 'Cliente atualizado com sucesso!', severity: 'success' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao atualizar cliente', severity: 'error' })
      }
    },
    [schema, loadClientes]
  )

  const handleDelete = useCallback(
    async (id: ClienteRow['id']) => {
      try {
        await clienteService.remove(schema, Number(id))
        setToast({ open: true, message: 'Cliente excluído com sucesso!', severity: 'success' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao excluir cliente', severity: 'error' })
      }
    },
    [schema, loadClientes]
  )

  // Custom row actions
  const rowActions: TableCardRowAction<ClienteRow>[] = useMemo(() => {
    const actions: TableCardRowAction<ClienteRow>[] = []
    
    // Add Points Action
    actions.push({
      label: 'Acrescentar Pontos',
      icon: <AddCircleOutline fontSize="small" />,
      onClick: (row) => {
         setSelectedCliente(row)
         setCreditData({ valor_reais: 0, valor_display: '' })
         setIsCreditModalOpen(true)
      }
    })

    // Debit Points Action
    actions.push({
      label: 'Debitar Pontos',
      icon: <RemoveCircleOutline fontSize="small" />,
      onClick: (row) => {
         setSelectedCliente(row)
         setCodigoResgate('')
         setIsDebitModalOpen(true)
      }
    })

    return actions
  }, [])

  if (!canList) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {loading && clientes.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableCard
          title="Clientes"
          rows={clientes}
          columns={columns}
          formFields={formFields}
          onAdd={canCreate ? handleCreate : undefined}
          onEdit={(id, data) => handleUpdate(id, data)}
          onDelete={canDelete ? handleDelete : undefined}
          disableView={!canView}
          rowActions={rowActions}
          onRowClick={(row) => navigate(`/clientes/${row.id}`)}
        />
      )}

      {/* Credit Modal */}
      <Dialog open={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Acrescentar Pontos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cliente: <strong>{selectedCliente?.nome_completo}</strong> • Saldo atual:{' '}
            <strong>{selectedCliente?.saldo ?? 0} pts</strong>
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
                Serão creditados <strong>{Math.floor(creditData.valor_reais * 100)} pontos</strong>
              </Typography>
            )}
            <DialogActions>
              <Button onClick={() => setIsCreditModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                disabled={!creditData.valor_reais || creditData.valor_reais <= 0 || isProcessingPoints}
              >
                {isProcessingPoints ? 'Creditando...' : 'Creditar Pontos'}
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
            Cliente: <strong>{selectedCliente?.nome_completo}</strong> • Saldo atual:{' '}
            <strong>{selectedCliente?.saldo} pts</strong>
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
                disabled={!codigoResgate || codigoResgate.length !== 5 || isProcessingPoints}
              >
                {isProcessingPoints ? 'Processando...' : 'Marcar como Utilizado'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

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

export default ClientesPage

