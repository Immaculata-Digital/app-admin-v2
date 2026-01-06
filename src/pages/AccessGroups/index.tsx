import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Chip, CircularProgress, Snackbar, Typography } from '@mui/material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
} from '../../components/TableCard'
import TextPicker from '../../components/TextPicker'
import MultiSelectPicker from '../../components/MultiSelectPicker'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import {
  type AccessGroupDTO,
  type FeatureDefinition,
  accessGroupService,
} from '../../services/accessGroups'

type AccessGroupRow = TableCardRow &
  Pick<AccessGroupDTO, 'name' | 'code' | 'features' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>

const DEFAULT_USER = 'admin'

const normalizeCode = (value: string) => {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
}

// Função para formatar o código durante a digitação (permite hífens)
const formatCodeInput = (value: string) => {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s/g, '-') // Converte espaços em hífens
    .replace(/[^a-zA-Z0-9-]/g, '') // Remove caracteres inválidos, mas mantém hífens
    .replace(/-{2,}/g, '-') // Remove hífens duplicados
    .toUpperCase()
}

// Mapear funcionalidades para opções do MultiSelectPicker
const mapFeaturesToOptions = (features: Array<{ key: string; name: string; description: string }>) => {
  return features.map(feature => ({
    value: feature.key,
    label: feature.name,
  }))
}

const mapGroupToRow = (group: AccessGroupDTO): AccessGroupRow => ({
  ...group,
})

const AccessGroupsPage = () => {
  const [groups, setGroups] = useState<AccessGroupRow[]>([])
  const [featureOptions, setFeatureOptions] = useState<Array<{ label: string; value: string }>>([])
  const [featureDictionary, setFeatureDictionary] = useState<Record<string, FeatureDefinition>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions, refreshPermissions } = useAuth()
  const canDelete = permissions.includes('erp:grupos-acesso:excluir')
  const canEdit = permissions.includes('erp:grupos-acesso:editar')
  const canCreate = permissions.includes('erp:grupos-acesso:criar')
  const canView = permissions.includes('erp:grupos-acesso:visualizar')
  const canList = permissions.includes('erp:grupos-acesso:listar')

  useEffect(() => {
    setPlaceholder('')
    const filters = [
      { id: 'name', label: 'Nome', field: 'name', type: 'text' as const, page: 'access-groups' },
      { id: 'code', label: 'Código', field: 'code', type: 'text' as const, page: 'access-groups' },
    ]
    setFilters(filters, 'name')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const loadFeatures = async () => {
    try {
      const list = await accessGroupService.listFeatures()
      const options = mapFeaturesToOptions(list)
      const dictionary = list.reduce<Record<string, FeatureDefinition>>((acc, feature) => {
        acc[feature.key] = feature
        return acc
      }, {})
      setFeatureOptions(options)
      setFeatureDictionary(dictionary)
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar as funcionalidades')
    }
  }

  const loadGroups = async () => {
    try {
      const data = await accessGroupService.list()
      setGroups(data.map(mapGroupToRow))
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar os grupos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeatures()
    if (canList) {
      loadGroups()
    } else {
      setLoading(false)
    }
  }, [canList])

  const handleAddGroup = async (data: Partial<AccessGroupRow>) => {
    try {
      const payload = {
        name: (data.name as string) ?? '',
        code: normalizeCode((data.code as string) ?? ''),
        features: Array.isArray(data.features) ? (data.features as string[]) : [],
        createdBy: DEFAULT_USER,
      }
      const created = await accessGroupService.create(payload)
      setGroups((prev) => [...prev, mapGroupToRow(created)])
      setToast({ open: true, message: 'Grupo criado com sucesso' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao criar grupo' })
    }
  }

  const handleEditGroup = async (id: AccessGroupRow['id'], data: Partial<AccessGroupRow>) => {
    try {
      const existing = groups.find((group) => group.id === id)
      if (!existing) return
      const payload = {
        name: (data.name as string) ?? existing.name,
        code: normalizeCode((data.code as string) ?? existing.code),
        features: Array.isArray(data.features) ? (data.features as string[]) : existing.features,
        updatedBy: DEFAULT_USER,
      }
      const updated = await accessGroupService.update(id as string, payload)
      setGroups((prev) => prev.map((group) => (group.id === id ? mapGroupToRow(updated) : group)))
      setToast({ open: true, message: 'Grupo atualizado' })
      await refreshPermissions()
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao atualizar grupo' })
    }
  }

  const handleDeleteGroup = async (id: AccessGroupRow['id']) => {
    try {
      await accessGroupService.remove(id as string)
      setGroups((prev) => prev.filter((group) => group.id !== id))
      setToast({ open: true, message: 'Grupo removido' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao remover grupo' })
    }
  }

  const handleBulkDelete = async (ids: AccessGroupRow['id'][]) => {
    try {
      await Promise.all(ids.map((id) => accessGroupService.remove(id as string)))
      setGroups((prev) => prev.filter((group) => !ids.includes(group.id)))
      setToast({ open: true, message: 'Grupos removidos' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao remover grupos' })
    }
  }

  const renderFeaturesCell = useCallback(
    (keys: string[]) => {
      if (!Array.isArray(keys) || keys.length === 0) {
        return <Typography color="text.secondary">Sem funcionalidades</Typography>
      }
      return (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {keys.map((key) => (
            <Chip key={key} label={featureDictionary[key]?.name ?? key} size="small" />
          ))}
        </Box>
      )
    },
    [featureDictionary],
  )

  const tableColumns = useMemo<TableCardColumn<AccessGroupRow>[]>(() => {
    return [
      { key: 'name', label: 'Nome' },
      { key: 'code', label: 'Código' },
      {
        key: 'features',
        label: 'Funcionalidades',
        render: (value: AccessGroupRow['features']) => renderFeaturesCell(value),
      },
    ]
  }, [renderFeaturesCell])

  const formFields = useMemo<TableCardFormField<AccessGroupRow>[]>(() => {
    return [
      {
        key: 'name',
        label: 'Nome do grupo',
        required: true,
        renderInput: ({ value, onChange, field, disabled }) => (
          <TextPicker
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            placeholder="Ex: Operações Norte"
            fullWidth
            required
            disabled={disabled}
          />
        ),
      },
      {
        key: 'code',
        label: 'Código',
        required: true,
        helperText: 'Use letras maiúsculas e hífens (ex: OPERACOES-NORTE)',
        renderInput: ({ value, onChange, field, disabled }) => (
          <TextPicker
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => {
              // Formata o código permitindo hífens durante a digitação
              const formatted = formatCodeInput(text)
              onChange(formatted)
            }}
            placeholder="OPERACOES-NORTE"
            fullWidth
            required
            disabled={disabled}
          />
        ),
      },
      {
        key: 'features',
        label: 'Funcionalidades padrão',
        renderInput: ({ value, onChange, field, disabled }) => (
          <MultiSelectPicker
            label={field.label}
            value={Array.isArray(value) ? value : []}
            onChange={(selected) => onChange(selected)}
            options={featureOptions}
            placeholder="Selecione as funcionalidades"
            fullWidth
            showSelectAll
            chipDisplay="block"
            maxDisplayChips={1}
            disabled={disabled}
          />
        ),
      },
    ]
  }, [featureOptions])

  return (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : !canList ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight="400px">
          <Typography variant="h6" color="text.secondary" className="access-denied-text">
            Você não tem permissão para listar estes dados
          </Typography>
        </Box>
      ) : (
        <TableCard
          title="Grupos de Acesso"
          columns={tableColumns}
          rows={groups}
          onAdd={canCreate ? handleAddGroup : undefined}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
          disableDelete={!canDelete}
          disableEdit={!canEdit}
          disableView={!canView}
          onBulkDelete={canDelete ? handleBulkDelete : undefined}
          formFields={formFields}
        />
      )}

      <Snackbar
        open={toast.open || Boolean(error)}
        autoHideDuration={4000}
        onClose={() => {
          setToast({ open: false, message: '' })
          setError(null)
        }}
        message={toast.open ? toast.message : error}
      />
    </Box>
  )
}

export default AccessGroupsPage

