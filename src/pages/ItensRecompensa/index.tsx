import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  CircularProgress,
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
import { itemRecompensaService, type ItemRecompensaDTO, type CreateItemRecompensaPayload, type UpdateItemRecompensaPayload } from '../../services/itensRecompensa'
import { getTenantSchema } from '../../utils/schema'
import './style.css'

type ItemRecompensaRow = TableCardRow & ItemRecompensaDTO

const DEFAULT_USER = 'admin'

const ItensRecompensaPage = () => {
  const [itens, setItens] = useState<ItemRecompensaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions } = useAuth()
  const canDelete = permissions.includes('erp:itens-recompensa:excluir')
  const canEdit = permissions.includes('erp:itens-recompensa:editar')
  const canCreate = permissions.includes('erp:itens-recompensa:criar')
  const canView = permissions.includes('erp:itens-recompensa:visualizar')
  const canList = permissions.includes('erp:itens-recompensa:listar')

  useEffect(() => {
    setPlaceholder('Buscar itens de recompensa por nome ou descrição...')
    const filters = [
      { id: 'nome_item', label: 'Nome do Item', field: 'nome_item', type: 'text' as const, page: 'itens-recompensa' },
      { id: 'descricao', label: 'Descrição', field: 'descricao', type: 'text' as const, page: 'itens-recompensa' },
    ]
    setFilters(filters, 'nome_item')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const loadItens = async () => {
    try {
      setLoading(true)
      const response = await itemRecompensaService.list(getTenantSchema(), { limit: 200, offset: 0 })
      setItens(response.itens.map(mapItemToRow))
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar os itens de recompensa')
      setToast({ open: true, message: err.message || 'Erro ao carregar itens de recompensa' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canList) {
      loadItens()
    }
  }, [canList])

  const mapItemToRow = (item: ItemRecompensaDTO): ItemRecompensaRow => ({
    ...item,
    id: item.id_item_recompensa?.toString() || '',
  })

  const columns: TableCardColumn<ItemRecompensaRow>[] = useMemo(
    () => [
      {
        key: 'nome_item',
        label: 'Nome do Item',
      },
      {
        key: 'descricao',
        label: 'Descrição',
      },
      {
        key: 'quantidade_pontos',
        label: 'Pontos',
        render: (value) => <Typography align="right">{value}</Typography>,
      },
      {
        key: 'nao_retirar_loja',
        label: 'Não Retirar na Loja',
        render: (value: boolean) => (value ? 'Sim' : 'Não'),
      },
    ],
    []
  )

  const formFields: TableCardFormField<ItemRecompensaRow>[] = useMemo(
    () => [
      {
        key: 'nome_item',
        label: 'Nome do Item',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Nome do Item"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'descricao',
        label: 'Descrição',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Descrição"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            multiline
            rows={3}
            disabled={disabled}
          />
        ),
      },
      {
        key: 'quantidade_pontos',
        label: 'Quantidade de Pontos',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Quantidade de Pontos"
            value={typeof value === 'number' ? value.toString() : typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(Number(text) || 0)}
            fullWidth
            type="number"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'imagem_item',
        label: 'Imagem (Base64)',
        required: false,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Imagem (Base64)"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            multiline
            rows={4}
            disabled={disabled}
          />
        ),
      },
      {
        key: 'nao_retirar_loja',
        label: 'Não Retirar na Loja',
        required: false,
        renderInput: ({ value, onChange, disabled }) => (
          <Box display="flex" alignItems="center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
            />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Não Retirar na Loja
            </Typography>
          </Box>
        ),
      },
    ],
    []
  )

  const handleCreate = useCallback(
    async (formData: Partial<ItemRecompensaRow>) => {
      try {
        const payload: CreateItemRecompensaPayload = {
          nome_item: (formData.nome_item as string) ?? '',
          descricao: (formData.descricao as string) ?? '',
          quantidade_pontos: Number(formData.quantidade_pontos) || 0,
          imagem_item: (formData.imagem_item as string | null) || null,
          nao_retirar_loja: formData.nao_retirar_loja === true || formData.nao_retirar_loja === 'true',
        }
        await itemRecompensaService.create(getTenantSchema(), payload)
        setToast({ open: true, message: 'Item de recompensa criado com sucesso!' })
        await loadItens()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao criar item de recompensa' })
        throw err
      }
    },
    []
  )

  const handleUpdate = useCallback(
    async (id: ItemRecompensaRow['id'], formData: Partial<ItemRecompensaRow>) => {
      try {
        const payload: UpdateItemRecompensaPayload = {
          nome_item: formData.nome_item as string | undefined,
          descricao: formData.descricao as string | undefined,
          quantidade_pontos: formData.quantidade_pontos ? Number(formData.quantidade_pontos) : undefined,
          imagem_item: formData.imagem_item !== undefined ? (formData.imagem_item as string | null) : undefined,
          nao_retirar_loja: formData.nao_retirar_loja !== undefined ? (formData.nao_retirar_loja === true || formData.nao_retirar_loja === 'true') : undefined,
        }
        await itemRecompensaService.update(getTenantSchema(), Number(id), payload)
        setToast({ open: true, message: 'Item de recompensa atualizado com sucesso!' })
        await loadItens()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao atualizar item de recompensa' })
        throw err
      }
    },
    []
  )

  const handleDelete = useCallback(
    async (id: ItemRecompensaRow['id']) => {
      try {
        await itemRecompensaService.remove(getTenantSchema(), Number(id))
        setToast({ open: true, message: 'Item de recompensa excluído com sucesso!' })
        await loadItens()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao excluir item de recompensa' })
        throw err
      }
    },
    []
  )

  if (!canList) {
    return (
      <Box className="itens-recompensa-page">
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="itens-recompensa-page">
      <TableCard
        title="Itens de Recompensa"
        rows={itens}
        columns={columns}
        formFields={formFields}
        onAdd={canCreate ? handleCreate : undefined}
        onEdit={canEdit ? handleUpdate : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        disableView={!canView}
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

export default ItensRecompensaPage

