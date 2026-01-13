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
import CnpjPicker from '../../components/CnpjPicker'
import MultiSelectPicker from '../../components/MultiSelectPicker'
import { lojaService, type LojaDTO, type CreateLojaPayload, type UpdateLojaPayload } from '../../services/lojas'
import { userService, type UserDTO } from '../../services/users'
import { accessGroupService } from '../../services/accessGroups'
import { getTenantSchema } from '../../utils/schema'
import { downloadQRCodeClienteRegistro } from '../../utils/qrcode.utils'

type LojaRow = TableCardRow & LojaDTO & {
  responsaveis?: string[]
}

type GroupDictionary = Record<string, { name: string; code: string; features: string[] }>

const LojasPage = () => {
  const navigate = useNavigate()
  const [lojas, setLojas] = useState<LojaRow[]>([])
  const [_loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [_error, setError] = useState<string | null>(null)
  const [responsavelOptions, setResponsavelOptions] = useState<Array<{ label: string; value: string }>>([])
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions } = useAuth()
  const canDelete = permissions.includes('erp:lojas:excluir')
  const canEdit = permissions.includes('erp:lojas:editar')
  const canCreate = permissions.includes('erp:lojas:criar')
  const canView = permissions.includes('erp:lojas:visualizar')
  const canList = permissions.includes('erp:lojas:listar')

  useEffect(() => {
    setPlaceholder('Buscar lojas por nome, número identificador ou CNPJ...')
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

  // Carregar usuários do grupo ADM-LOJA
  useEffect(() => {
    const loadResponsaveis = async () => {
      try {
        // Carregar grupos de acesso
        const groups = await accessGroupService.list()
        const groupDictionary: GroupDictionary = groups.reduce<GroupDictionary>((acc, group) => {
          acc[group.id] = { name: group.name, code: group.code, features: group.features }
          return acc
        }, {})

        // Encontrar o ID do grupo ADM-LOJA
        const admLojaGroupId = Object.keys(groupDictionary).find(
          (groupId) => groupDictionary[groupId]?.code === 'ADM-LOJA'
        )

        if (!admLojaGroupId) {
          console.warn('Grupo ADM-LOJA não encontrado')
          setResponsavelOptions([])
          return
        }

        // Carregar todos os usuários
        const users = await userService.list()
        
        // Filtrar usuários que estão no grupo ADM-LOJA
        const admLojaUsers = users.filter((user: UserDTO) => 
          user.groupIds.includes(admLojaGroupId)
        )

        // Criar opções para o MultiSelectPicker
        const options = admLojaUsers.map((user: UserDTO) => ({
          label: user.fullName,
          value: user.id,
        }))

        setResponsavelOptions(options)
      } catch (err) {
        console.error('Erro ao carregar responsáveis:', err)
        setResponsavelOptions([])
      }
    }

    loadResponsaveis()
  }, [])

  const mapLojaToRow = useCallback(async (loja: LojaDTO): Promise<LojaRow> => {
    // Buscar responsáveis da tabela user_lojas_gestoras
    let responsaveisIds: string[] = []
    if (loja.id_loja) {
      try {
        const responsaveis = await lojaService.getResponsaveis(getTenantSchema(), loja.id_loja)
        responsaveisIds = responsaveis.userIds || []
      } catch (err) {
        console.error('Erro ao buscar responsáveis da loja:', err)
        // Fallback: tentar encontrar pelo nome_responsavel se houver
        if (loja.nome_responsavel && responsavelOptions.length > 0) {
          const responsavelEncontrado = responsavelOptions.find(
            opt => opt.label === loja.nome_responsavel
          )
          if (responsavelEncontrado) {
            responsaveisIds = [responsavelEncontrado.value]
          }
        }
      }
    }

    return {
      ...loja,
      id: loja.id_loja?.toString() || '',
      responsaveis: responsaveisIds,
    } as LojaRow
  }, [responsavelOptions])

  const loadLojas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await lojaService.list(getTenantSchema(), { limit: 200, offset: 0 })
      const lojasComResponsaveis = await Promise.all(response.itens.map(mapLojaToRow))
      setLojas(lojasComResponsaveis)
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar as lojas')
      setToast({ open: true, message: err.message || 'Erro ao carregar lojas' })
    } finally {
      setLoading(false)
    }
  }, [mapLojaToRow])

  useEffect(() => {
    if (canList) {
      loadLojas()
    }
  }, [canList, loadLojas])

  // Recarregar lojas quando os responsáveis forem carregados para mapear corretamente
  useEffect(() => {
    if (canList && responsavelOptions.length > 0) {
      loadLojas()
    }
  }, [canList, responsavelOptions.length, loadLojas])

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
            required
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
            required
          />
        ),
      },
      {
        key: 'responsaveis',
        label: 'Responsáveis',
        required: true,
        renderInput: ({ value, onChange, disabled }) => {
          const selectedIds = Array.isArray(value) ? value : []
          return (
            <MultiSelectPicker
              label="Responsáveis"
              value={selectedIds}
              onChange={(ids) => onChange(ids)}
              options={responsavelOptions}
              fullWidth
              placeholder="Selecione os responsáveis"
              disabled={disabled}
              required
            />
          )
        },
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
            required
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
            required
          />
        ),
      },
    ],
    [responsavelOptions]
  )

  const handleCreate = useCallback(
    async (formData: Partial<LojaRow>) => {
      const responsaveisIds = Array.isArray(formData.responsaveis) ? formData.responsaveis as string[] : []
      const primeiroResponsavel = responsaveisIds.length > 0 
        ? responsavelOptions.find(opt => opt.value === responsaveisIds[0])
        : null

      const payload: CreateLojaPayload = {
        nome_loja: (formData.nome_loja as string) ?? '',
        numero_identificador: (formData.numero_identificador as string) ?? '',
        nome_responsavel: primeiroResponsavel?.label || '',
        telefone_responsavel: '', // Campo removido, enviar vazio
        cnpj: (formData.cnpj as string) ?? '',
        endereco_completo: (formData.endereco_completo as string) ?? '',
      }
      
      try {
        const loja = await lojaService.create(getTenantSchema(), payload)
        
        // Atualizar vínculos de responsáveis na tabela user_lojas_gestoras
        if (loja.id_loja && responsaveisIds.length > 0) {
          await lojaService.updateResponsaveis(getTenantSchema(), loja.id_loja, responsaveisIds)
        }
        
        setToast({ open: true, message: 'Loja criada com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        console.error('Erro no handleCreate:', err, 'status:', err?.status)
        // Se for erro 422, re-lançar para que o TableCard possa tratar
        if (err?.status === 422) {
          // Garantir que o erro mantenha o status ao ser re-lançado
          const errorWithStatus: any = err instanceof Error ? err : new Error(err?.message || 'Erro de validação')
          errorWithStatus.status = err?.status || 422
          errorWithStatus.details = err?.details
          throw errorWithStatus
        }
        setToast({ open: true, message: err.message || 'Erro ao criar loja' })
      }
    },
    [responsavelOptions, loadLojas]
  )

  const handleUpdate = useCallback(
    async (id: LojaRow['id'], formData: Partial<LojaRow>) => {
      const responsaveisIds = Array.isArray(formData.responsaveis) ? formData.responsaveis as string[] : []
      const primeiroResponsavel = responsaveisIds.length > 0 
        ? responsavelOptions.find(opt => opt.value === responsaveisIds[0])
        : null

      const payload: UpdateLojaPayload = {
        nome_loja: formData.nome_loja as string | undefined,
        numero_identificador: formData.numero_identificador as string | undefined,
        nome_responsavel: primeiroResponsavel?.label,
        telefone_responsavel: '', // Campo removido, enviar vazio
        cnpj: formData.cnpj as string | undefined,
        endereco_completo: formData.endereco_completo as string | undefined,
      }
      
      try {
        await lojaService.update(getTenantSchema(), Number(id), payload)
        
        // Atualizar vínculos de responsáveis na tabela user_lojas_gestoras
        await lojaService.updateResponsaveis(getTenantSchema(), Number(id), responsaveisIds)
        
        setToast({ open: true, message: 'Loja atualizada com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        console.error('Erro no handleUpdate:', err, 'status:', err?.status)
        // Se for erro 422, re-lançar para que o TableCard possa tratar
        if (err?.status === 422) {
          // Garantir que o erro mantenha o status ao ser re-lançado
          const errorWithStatus: any = err instanceof Error ? err : new Error(err?.message || 'Erro de validação')
          errorWithStatus.status = err?.status || 422
          errorWithStatus.details = err?.details
          throw errorWithStatus
        }
        setToast({ open: true, message: err.message || 'Erro ao atualizar loja' })
      }
    },
    [responsavelOptions, loadLojas]
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

  const handleBulkDelete = useCallback(
    async (ids: LojaRow['id'][]) => {
      try {
        await Promise.all(ids.map((id) => lojaService.remove(getTenantSchema(), Number(id))))
        setToast({ open: true, message: 'Lojas excluídas com sucesso!' })
        await loadLojas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao excluir lojas' })
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
      <Box>
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <TableCard
        title="Lojas"
        rows={lojas}
        columns={columns}
        formFields={formFields}
        onAdd={canCreate ? handleCreate : undefined}
        onEdit={canEdit ? handleUpdate : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onBulkDelete={canDelete ? handleBulkDelete : undefined}
        disableView={!canView}
        rowActions={rowActions}
        onValidationError={(message) => setToast({ open: true, message })}
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

