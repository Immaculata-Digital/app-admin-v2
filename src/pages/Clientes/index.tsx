import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Typography,
} from '@mui/material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
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
import './style.css'

type ClienteRow = TableCardRow & ClienteDTO

const DEFAULT_USER = 'admin'

const ClientesPage = () => {
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [lojas, setLojas] = useState<Array<{ id: number; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
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
      setToast({ open: true, message: err.message || 'Erro ao carregar clientes' })
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

  const columns: TableCardColumn<ClienteRow>[] = useMemo(
    () => [
      { key: 'nome_completo', label: 'Nome Completo' },
      { key: 'email', label: 'Email' },
      { key: 'whatsapp', label: 'WhatsApp' },
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
          whatsapp: formData.whatsapp || '', // PhonePicker retorna formato +55...
          cep: formData.cep || '', // CepPicker retorna apenas números
          sexo: (formData.sexo as 'M' | 'F') || 'M',
          aceite_termos: true,
          senha: '123456', // Senha padrão - pode ser melhorado depois
        }
        await clienteService.create(schema, payload)
        setToast({ open: true, message: 'Cliente criado com sucesso!' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao criar cliente' })
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
        setToast({ open: true, message: 'Cliente atualizado com sucesso!' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao atualizar cliente' })
      }
    },
    [schema, loadClientes]
  )

  const handleDelete = useCallback(
    async (id: ClienteRow['id']) => {
      try {
        await clienteService.remove(schema, Number(id))
        setToast({ open: true, message: 'Cliente excluído com sucesso!' })
        loadClientes()
      } catch (err: any) {
        console.error(err)
        setToast({ open: true, message: err.message || 'Erro ao excluir cliente' })
      }
    },
    [schema, loadClientes]
  )

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Clientes
      </Typography>

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
          onEdit={canEdit ? handleUpdate : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          disableView={!canView}
        />
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ open: false, message: '' })}
        message={toast.message}
      />
    </Box>
  )
}

export default ClientesPage

