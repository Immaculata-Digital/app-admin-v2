import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Snackbar,
  Typography,
} from '@mui/material'
import { QrCode, People, Person } from '@mui/icons-material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
  type TableCardRowAction,
} from '../../components/TableCard'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import TextPicker from '../../components/TextPicker'
import PhonePicker from '../../components/PhonePicker'
import CnpjPicker from '../../components/CnpjPicker'
import { lojaService, type LojaDTO, type CreateLojaPayload, type UpdateLojaPayload } from '../../services/lojas'
import { getTenantSchema } from '../../utils/schema'
import { downloadQRCodeClienteRegistro } from '../../utils/qrcode.utils'
import './style.css'

type LojaRow = TableCardRow & LojaDTO

const LojasPage = () => {
  const navigate = useNavigate()
  const [lojas, setLojas] = useState<LojaRow[]>([])
  const [_loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [_error, setError] = useState<string | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions } = useAuth()
  const canDelete = permissions.includes('erp:lojas:excluir')
  const canEdit = permissions.includes('erp:lojas:editar')
  const canCreate = permissions.includes('erp:lojas:criar')
  const canView = permissions.includes('erp:lojas:visualizar')
  const canList = permissions.includes('erp:lojas:listar')

  useEffect(() => {
    setPlaceholder('Buscar lojas por nome, número identificador, responsável ou CNPJ...')
    const filters = [
      { id: 'nome_loja', label: 'Nome da Loja', field: 'nome_loja', type: 'text' as const, page: 'lojas' },
      { id: 'numero_identificador', label: 'Número Identificador', field: 'numero_identificador', type: 'text' as const, page: 'lojas' },
    ]
    setFilters(filters, 'nome_loja')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const loadLojas = async () => {
    try {
      setLoading(true)
      const response = await lojaService.list(getTenantSchema(), { limit: 200, offset: 0 })
      setLojas(response.itens.map(mapLojaToRow))
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar as lojas')
      setToast({ open: true, message: err.message || 'Erro ao carregar lojas' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canList) {
      loadLojas()
    }
  }, [canList])

  const mapLojaToRow = (loja: LojaDTO): LojaRow => ({
    ...loja,
    id: loja.id_loja?.toString() || '',
  })

  const columns: TableCardColumn<LojaRow>[] = useMemo(
    () => [
      {
        key: 'nome_loja',
        label: 'Nome da Loja',
      },
      {
        key: 'numero_identificador',
        label: 'Número Identificador',
      },
      {
        key: 'nome_responsavel',
        label: 'Responsável',
      },
      {
        key: 'telefone_responsavel',
        label: 'Telefone',
      },
      {
        key: 'cnpj',
        label: 'CNPJ',
      },
    ],
    []
  )

  const formFields: TableCardFormField<LojaRow>[] = useMemo(
    () => [
      {
        key: 'nome_loja',
        label: 'Nome da Loja',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Nome da Loja"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'numero_identificador',
        label: 'Número Identificador',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Número Identificador"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'nome_responsavel',
        label: 'Nome do Responsável',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Nome do Responsável"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'telefone_responsavel',
        label: 'Telefone do Responsável',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <PhonePicker
            label="Telefone do Responsável"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            placeholder="+55 (00) 0 0000-0000"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'cnpj',
        label: 'CNPJ',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <CnpjPicker
            label="CNPJ"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'endereco_completo',
        label: 'Endereço Completo',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Endereço Completo"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            multiline
            rows={3}
            disabled={disabled}
          />
        ),
      },
    ],
    []
  )

  const handleCreate = useCallback(
    async (formData: Partial<LojaRow>) => {
      try {
        const payload: CreateLojaPayload = {
          nome_loja: (formData.nome_loja as string) ?? '',
          numero_identificador: (formData.numero_identificador as string) ?? '',
          nome_responsavel: (formData.nome_responsavel as string) ?? '',
          telefone_responsavel: (formData.telefone_responsavel as string) ?? '',
          cnpj: (formData.cnpj as string) ?? '',
          endereco_completo: (formData.endereco_completo as string) ?? '',
        }
        await lojaService.create(getTenantSchema(), payload)
        setToast({ open: true, message: 'Loja criada com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao criar loja' })
        throw err
      }
    },
    []
  )

  const handleUpdate = useCallback(
    async (id: LojaRow['id'], formData: Partial<LojaRow>) => {
      try {
        const payload: UpdateLojaPayload = {
          nome_loja: formData.nome_loja as string | undefined,
          numero_identificador: formData.numero_identificador as string | undefined,
          nome_responsavel: formData.nome_responsavel as string | undefined,
          telefone_responsavel: formData.telefone_responsavel as string | undefined,
          cnpj: formData.cnpj as string | undefined,
          endereco_completo: formData.endereco_completo as string | undefined,
        }
        await lojaService.update(getTenantSchema(), Number(id), payload)
        setToast({ open: true, message: 'Loja atualizada com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao atualizar loja' })
        throw err
      }
    },
    []
  )

  const handleDelete = useCallback(
    async (id: LojaRow['id']) => {
      try {
        await lojaService.remove(getTenantSchema(), Number(id))
        setToast({ open: true, message: 'Loja excluída com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao excluir loja' })
        throw err
      }
    },
    []
  )

  const handleDownloadQRCode = useCallback(
    async (loja: LojaRow) => {
      try {
        if (!loja.id_loja || !loja.nome_loja) {
          setToast({ open: true, message: 'Dados da loja incompletos' })
          return
        }
        await downloadQRCodeClienteRegistro(loja.id_loja, loja.nome_loja)
        setToast({ open: true, message: 'QR Code baixado com sucesso!' })
      } catch (error: any) {
        console.error('Erro ao gerar QR Code:', error)
        setToast({ open: true, message: error?.message || 'Erro ao gerar QR Code' })
      }
    },
    []
  )

  const handleVerClientes = useCallback(
    (loja: LojaRow) => {
      if (!loja.nome_loja) return
      navigate(`/clientes?loja=${encodeURIComponent(loja.nome_loja)}`)
    },
    [navigate]
  )

  const handleVerUsuarios = useCallback(
    (loja: LojaRow) => {
      if (!loja.id_loja) return
      navigate(`/usuarios?loja=${loja.id_loja}`)
    },
    [navigate]
  )

  const rowActions: TableCardRowAction<LojaRow>[] = useMemo(
    () => [
      {
        label: 'Baixar QR Code',
        icon: <QrCode fontSize="small" />,
        onClick: handleDownloadQRCode,
      },
      {
        label: 'Ver Clientes',
        icon: <People fontSize="small" />,
        onClick: handleVerClientes,
      },
      {
        label: 'Ver Usuários',
        icon: <Person fontSize="small" />,
        onClick: handleVerUsuarios,
      },
    ],
    [handleDownloadQRCode, handleVerClientes, handleVerUsuarios]
  )

  if (!canList) {
    return (
      <Box className="lojas-page">
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="lojas-page">
      <TableCard
        title="Lojas"
        rows={lojas}
        columns={columns}
        formFields={formFields}
        onAdd={canCreate ? handleCreate : undefined}
        onEdit={canEdit ? handleUpdate : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        disableView={!canView}
        rowActions={rowActions}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
      />
    </Box>
  )
}

export default LojasPage

