import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import { PasswordOutlined, VisibilityOutlined, Groups2Outlined, SecurityOutlined } from '@mui/icons-material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
  type TableCardRowAction,
  type TableCardBulkAction,
} from '../../components/TableCard'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import TextPicker from '../../components/TextPicker'
import PasswordPicker from '../../components/PasswordPicker'
import MultiSelectPicker from '../../components/MultiSelectPicker'
import MailPicker from '../../components/MailPicker'
import { accessGroupService } from '../../services/accessGroups'
import { userService, type UserDTO } from '../../services/users'
import { lojaService } from '../../services/lojas'
import { getTenantSchema } from '../../utils/schema'
import './style.css'

type UserRow = TableCardRow & {
  id: string
  fullName: string
  login: string
  email: string
  groupIds: string[]
  groupNames: string[]
  allowFeatures: string[]
  deniedFeatures: string[]
  lojasGestoras?: number[]
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

const DEFAULT_USER = 'admin'
type GroupDictionary = Record<string, { name: string; code: string; features: string[] }>

const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([])
  const [groupOptions, setGroupOptions] = useState<Array<{ label: string; value: string }>>([])
  const [groupDictionary, setGroupDictionary] = useState<GroupDictionary>({})
  const [featureOptions, setFeatureOptions] = useState<Array<{ label: string; value: string }>>([])
  const [featureDictionary, setFeatureDictionary] = useState<Record<string, string>>({})
  const [lojaOptions, setLojaOptions] = useState<Array<{ label: string; value: number }>>([])
  const [loading, setLoading] = useState(true)
  const [detailUser, setDetailUser] = useState<UserRow | null>(null)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const [manageGroupsDialog, setManageGroupsDialog] = useState<{
    open: boolean
    userId: string | null
    groupIds: string[]
    allowFeatures: string[]
    lojasGestoras: number[]
  }>({ open: false, userId: null, groupIds: [], allowFeatures: [], lojasGestoras: [] })
  const [manageAccessDialog, setManageAccessDialog] = useState<{
    open: boolean
    userId: string | null
    allowFeatures: string[]
    deniedFeatures: string[]
  }>({ open: false, userId: null, allowFeatures: [], deniedFeatures: [] })
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { user: currentUser, refreshPermissions, permissions } = useAuth()

  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes(permission)
    },
    [permissions],
  )

  useEffect(() => {
    setPlaceholder('')
    const filters = [
      { id: 'fullName', label: 'Nome', field: 'fullName', type: 'text' as const, page: 'users' },
      { id: 'login', label: 'Login', field: 'login', type: 'text' as const, page: 'users' },
      { id: 'email', label: 'E-mail', field: 'email', type: 'text' as const, page: 'users' },
    ]
    setFilters(filters, 'fullName')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const mapUserToRow = useCallback(
    (user: UserDTO, dictionary: GroupDictionary = groupDictionary): UserRow => ({
      ...user,
      groupNames: user.groupIds.map((groupId) => dictionary[groupId]?.name ?? groupId),
    }),
    [groupDictionary],
  )

  const loadFeatures = async () => {
    const list = await accessGroupService.listFeatures()
    setFeatureOptions(list.map((feature) => ({ label: feature.name, value: feature.key })))
    setFeatureDictionary(
      list.reduce<Record<string, string>>((acc, feature) => {
        acc[feature.key] = feature.name
        return acc
      }, {}),
    )
  }

  const loadGroups = async (): Promise<GroupDictionary> => {
    const list = await accessGroupService.list()
    setGroupOptions(list.map((group) => ({ label: group.name, value: group.id })))
    const dictionary = list.reduce<GroupDictionary>((acc, group) => {
      acc[group.id] = { name: group.name, code: group.code, features: group.features }
      return acc
    }, {})
    setGroupDictionary(dictionary)
    return dictionary
  }

  const loadLojas = async () => {
    try {
      const schema = getTenantSchema()
      const response = await lojaService.list(schema, { limit: 200, offset: 0 })
      setLojaOptions(response.itens.map((loja) => ({ 
        label: loja.nome_loja, 
        value: loja.id_loja ?? 0 
      })))
    } catch (err) {
      console.error('Erro ao carregar lojas:', err)
    }
  }

  const loadUsers = async (dictionary: GroupDictionary = groupDictionary) => {
    const data = await userService.list()
    setUsers(data.map((user) => mapUserToRow(user, dictionary)))
  }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        await loadFeatures()
        const dictionary = await loadGroups()
        await loadLojas()
        await loadUsers(dictionary)
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar usuários')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mergeGroupFeatures = useCallback(
    (selectedGroupIds: string[], currentAllow: string[] = []) => {
      const featureSet = new Set(currentAllow)
      selectedGroupIds.forEach((groupId) => {
        const features = groupDictionary[groupId]?.features ?? []
        features.forEach((feature) => featureSet.add(feature))
      })
      return Array.from(featureSet)
    },
    [groupDictionary],
  )

  const handleManageGroups = useCallback((selectedIds: UserRow['id'][]) => {
    if (selectedIds.length !== 1) return
    const userId = selectedIds[0] as string
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setManageGroupsDialog({
      open: true,
      userId,
      groupIds: user.groupIds,
      allowFeatures: mergeGroupFeatures(user.groupIds, []),
      lojasGestoras: Array.isArray(user.lojasGestoras) ? user.lojasGestoras : [],
    })
  }, [users, mergeGroupFeatures])

  const handleSaveGroups = async () => {
    if (!manageGroupsDialog.userId) return
    try {
      const payload = {
        groupIds: manageGroupsDialog.groupIds,
        updatedBy: DEFAULT_USER,
      }
      const updated = await userService.updateGroups(manageGroupsDialog.userId, payload)
      
      // Atualizar lojas gestoras se o grupo ADM-LOJA estiver selecionado
      const hasAdmLojaGroup = manageGroupsDialog.groupIds.some((groupId) => {
        const group = groupDictionary[groupId]
        return group?.code === 'ADM-LOJA'
      })
      
      if (hasAdmLojaGroup) {
        const basicPayload = {
          fullName: updated.fullName,
          login: updated.login,
          email: updated.email,
          lojasGestoras: manageGroupsDialog.lojasGestoras,
          updatedBy: DEFAULT_USER,
        }
        await userService.updateBasic(manageGroupsDialog.userId, basicPayload)
      }
      
      await loadUsers()
      setToast({ open: true, message: 'Grupos atualizados com sucesso' })
      setManageGroupsDialog((prev) => ({ ...prev, open: false }))
      if (currentUser?.id === manageGroupsDialog.userId) {
        await refreshPermissions()
      }
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao atualizar grupos' })
    }
  }

  const handleManageAccess = useCallback((selectedIds: UserRow['id'][]) => {
    if (selectedIds.length !== 1) return
    const userId = selectedIds[0] as string
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setManageAccessDialog({
      open: true,
      userId,
      allowFeatures: user.allowFeatures,
      deniedFeatures: user.deniedFeatures,
    })
  }, [users])

  const handleSaveAccess = async () => {
    if (!manageAccessDialog.userId) return
    try {
      const payload = {
        allowFeatures: manageAccessDialog.allowFeatures,
        deniedFeatures: manageAccessDialog.deniedFeatures,
        updatedBy: DEFAULT_USER,
      }
      const updated = await userService.updatePermissions(manageAccessDialog.userId, payload)
      setUsers((prev) => prev.map((user) => (user.id === manageAccessDialog.userId ? mapUserToRow(updated) : user)))
      setToast({ open: true, message: 'Acessos atualizados com sucesso' })
      setManageAccessDialog((prev) => ({ ...prev, open: false }))
      if (currentUser?.id === manageAccessDialog.userId) {
        await refreshPermissions()
      }
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao atualizar acessos' })
    }
  }

  const handleAddUser = async (data: Partial<UserRow>) => {
    try {
      const payload = {
        fullName: (data.fullName as string) ?? '',
        login: (data.login as string) ?? '',
        email: (data.email as string) ?? '',
        password: (data as any).password, // Campo opcional de senha
        groupIds: Array.isArray(data.groupIds) ? (data.groupIds as string[]) : [],
        allowFeatures: Array.isArray(data.allowFeatures) ? (data.allowFeatures as string[]) : [],
        deniedFeatures: Array.isArray(data.deniedFeatures) ? (data.deniedFeatures as string[]) : [],
        lojasGestoras: Array.isArray(data.lojasGestoras) ? (data.lojasGestoras as number[]) : undefined,
        createdBy: DEFAULT_USER,
      }
      await userService.create(payload)
      await loadUsers()
      setToast({ open: true, message: 'Usuário criado com sucesso' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao criar usuário' })
    }
  }

  const handleEditUser = async (id: UserRow['id'], data: Partial<UserRow>) => {
    try {
      const payload = {
        fullName: data.fullName as string,
        login: data.login as string,
        email: data.email as string,
        lojasGestoras: Array.isArray(data.lojasGestoras) ? (data.lojasGestoras as number[]) : undefined,
        updatedBy: DEFAULT_USER,
      }
      const updated = await userService.updateBasic(id as string, payload)
      setUsers((prev) => prev.map((user) => (user.id === id ? mapUserToRow(updated) : user)))
      setToast({ open: true, message: 'Usuário atualizado' })
      if (currentUser?.id === id) {
        await refreshPermissions()
      }
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao atualizar' })
    }
  }

  const handleDeleteUser = async (id: UserRow['id']) => {
    try {
      await userService.remove(id as string)
      setUsers((prev) => prev.filter((user) => user.id !== id))
      setToast({ open: true, message: 'Usuário removido' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao remover' })
    }
  }

  const handleBulkDelete = async (ids: UserRow['id'][]) => {
    try {
      await Promise.all(ids.map((id) => userService.remove(id as string)))
      setUsers((prev) => prev.filter((user) => !ids.includes(user.id)))
      setToast({ open: true, message: 'Usuários removidos' })
    } catch (err) {
      console.error(err)
      setToast({ open: true, message: err instanceof Error ? err.message : 'Erro ao remover' })
    }
  }

  const handleViewUser = (user: UserRow) => {
    setDetailUser(user)
  }

  const handleSendPasswordUpdate = async (user: UserRow) => {
    try {
      await userService.requestPasswordReset(user.email)
      setToast({
        open: true,
        message: `Solicitação de alteração de senha enviada para ${user.email}`,
      })
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao enviar solicitação de alteração de senha',
      })
    }
  }

  const handleBulkSendPasswordUpdate = async (ids: UserRow['id'][]) => {
    try {
      const usersToSend = users.filter((u) => ids.includes(u.id))
      await Promise.all(usersToSend.map((user) => userService.requestPasswordReset(user.email)))
      setToast({
        open: true,
        message: `Solicitação de alteração de senha enviada para ${ids.length} usuário(s)`,
      })
    } catch (err) {
      console.error(err)
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao enviar solicitação de alteração de senha',
      })
    }
  }

  const groupChips = useCallback(
    (names: string[]) => {
      if (!Array.isArray(names) || names.length === 0) {
        return <Typography variant="body2" color="text.secondary" className="users-page__empty-text">-</Typography>
      }
      return (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {names.map((name) => (
            <Chip key={name} label={name} size="small" />
          ))}
        </Stack>
      )
    },
    [],
  )

  const featureChips = useCallback(
    (keys: string[]) => {
      if (!Array.isArray(keys) || keys.length === 0) {
        return <Typography variant="body2" color="text.secondary" className="users-page__empty-text">-</Typography>
      }
      return (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {keys.map((key) => (
            <Chip key={key} label={featureDictionary[key] ?? key} size="small" />
          ))}
        </Stack>
      )
    },
    [featureDictionary],
  )

  const userFormFields: TableCardFormField<UserRow>[] = useMemo(
    () => [
      {
        key: 'fullName',
        label: 'Nome completo',
        required: true,
        renderInput: ({ value, onChange, field, disabled }) => (
          <TextPicker
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            placeholder="Informe o nome completo"
            required
            disabled={disabled}
          />
        ),
      },
      {
        key: 'login',
        label: 'Login',
        required: true,
        renderInput: ({ value, onChange, field, disabled }) => (
          <TextPicker
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            placeholder="Defina um login único"
            required
            disabled={disabled}
          />
        ),
      },
      {
        key: 'email',
        label: 'E-mail',
        required: true,
        renderInput: ({ value, onChange, field, disabled }) => (
          <MailPicker
            label={field.label}
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            placeholder="usuario@empresa.com"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'password',
        label: 'Senha (opcional)',
        required: false,
        helperText: 'Se informada, a senha será definida diretamente. Caso contrário, será enviado email de reset.',
        renderInput: ({ value, onChange, field, disabled, formValues }) => {
          // Só mostrar campo de senha na criação (não na edição)
          if (formValues.id) return null
          return (
            <PasswordPicker
              label={field.label}
              value={typeof value === 'string' ? value : ''}
              onChange={(text) => onChange(text)}
              fullWidth
              placeholder="Deixe em branco para enviar email de reset"
              disabled={disabled}
            />
          )
        },
      },
      {
        key: 'groupIds',
        label: 'Grupos de Acesso',
        required: false,
        renderInput: ({ value, onChange, field, disabled }) => (
          <MultiSelectPicker
            label={field.label}
            value={Array.isArray(value) ? value : []}
            onChange={(selected) => onChange(selected)}
            options={groupOptions}
            placeholder="Selecione os grupos de acesso"
            fullWidth
            showSelectAll
            chipDisplay="block"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'lojasGestoras',
        label: 'Lojas Gestoras',
        required: false,
        helperText: 'Selecione as lojas das quais este usuário é gestor (apenas para grupo ADM-LOJA)',
        renderInput: ({ value, onChange, field, disabled, formValues }) => {
          // Verificar se algum grupo selecionado é ADM-LOJA
          const selectedGroupIds = Array.isArray(formValues.groupIds) ? formValues.groupIds : []
          const hasAdmLojaGroup = selectedGroupIds.some((groupId) => {
            const group = groupDictionary[groupId]
            return group?.code === 'ADM-LOJA'
          })

          // Só mostrar se o grupo ADM-LOJA estiver selecionado
          if (!hasAdmLojaGroup) return null

          return (
            <MultiSelectPicker
              label={field.label}
              value={Array.isArray(value) ? value : []}
              onChange={(selected) => onChange(selected)}
              options={lojaOptions}
              placeholder="Selecione as lojas gestoras"
              fullWidth
              showSelectAll
              chipDisplay="block"
              disabled={disabled}
            />
          )
        },
      },
    ],
    [groupOptions, lojaOptions, groupDictionary],
  )

  const rowActions: TableCardRowAction<UserRow>[] = useMemo(() => [
    {
      label: 'Ver',
      icon: <VisibilityOutlined fontSize="small" />,
      onClick: handleViewUser,
      disabled: !hasPermission('erp:usuarios:visualizar'),
    },
    {
      label: 'Gerenciar grupos de acessos',
      icon: <Groups2Outlined fontSize="small" />,
      onClick: (row) => handleManageGroups([row.id]),
      disabled: !hasPermission('erp:usuarios:atribuir-grupos'),
    },
    {
      label: 'Gerenciar acessos particulares',
      icon: <SecurityOutlined fontSize="small" />,
      onClick: (row) => handleManageAccess([row.id]),
      disabled: !hasPermission('erp:usuarios:atribuir-permissoes-particulares'),
    },
    {
      label: 'Enviar alteração de senha',
      icon: <PasswordOutlined fontSize="small" />,
      onClick: handleSendPasswordUpdate,
      disabled: !hasPermission('erp:usuarios:resetar-senha'),
    },
  ], [handleManageGroups, handleManageAccess, hasPermission])

  const bulkActions: TableCardBulkAction<UserRow>[] = useMemo(() => [
    {
      label: 'Ver',
      icon: <VisibilityOutlined />,
      onClick: (ids) => {
        const user = users.find((u) => u.id === ids[0])
        if (user) handleViewUser(user)
      },
      disabled: (ids) => ids.length !== 1 || !hasPermission('erp:usuarios:visualizar'),
    },
    {
      label: 'Gerenciar grupos de acessos',
      icon: <Groups2Outlined />,
      onClick: handleManageGroups,
      disabled: (ids) => ids.length !== 1 || !hasPermission('erp:usuarios:atribuir-grupos'),
    },
    {
      label: 'Gerenciar acessos particulares',
      icon: <SecurityOutlined />,
      onClick: handleManageAccess,
      disabled: (ids) => ids.length !== 1 || !hasPermission('erp:usuarios:atribuir-permissoes-particulares'),
    },
    {
      label: 'Enviar alteração de senha',
      icon: <PasswordOutlined />,
      onClick: handleBulkSendPasswordUpdate,
      disabled: (ids) => ids.length !== 1 || !hasPermission('erp:usuarios:resetar-senha'),
    }
  ], [handleManageGroups, handleManageAccess, users, hasPermission])

  const tableColumns = useMemo<TableCardColumn<UserRow>[]>(() => [
    { key: 'fullName', label: 'Nome completo' },
    { key: 'login', label: 'Login' },
    {
      key: 'groupNames',
      label: 'Grupos de Acesso',
      render: (value: UserRow['groupNames']) => groupChips(value),
    },
    {
      key: 'allowFeatures',
      label: 'Funcionalidades permitidas',
      render: (value: UserRow['allowFeatures']) => featureChips(value),
    },
    {
      key: 'deniedFeatures',
      label: 'Funcionalidades negadas',
      render: (value: UserRow['deniedFeatures']) => featureChips(value),
    },
  ], [featureChips, groupChips])

  if (!loading && !hasPermission('erp:usuarios:listar') && !hasPermission('erp:grupos-acesso:listar')) {
    return (
      <Box className="users-page">
        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          Você não tem permissão para listar estes dados
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableCard
          title="Usuários"
          columns={tableColumns}
          rows={users}
          onAdd={hasPermission('erp:usuarios:criar') ? handleAddUser : undefined}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onBulkDelete={hasPermission('erp:usuarios:excluir') ? handleBulkDelete : undefined}
          formFields={userFormFields}
          rowActions={rowActions}
          bulkActions={bulkActions}
          disableDelete={!hasPermission('erp:usuarios:excluir')}
          disableEdit={!hasPermission('erp:usuarios:editar')}
          disableView={!hasPermission('erp:usuarios:visualizar')}
        />
      )}
{/* ... keep existing dialogs ... */}
      <Dialog open={Boolean(detailUser)} onClose={() => setDetailUser(null)} fullWidth maxWidth="sm">
        <DialogTitle>Detalhes do usuário</DialogTitle>
        <DialogContent dividers>
          {detailUser && (
            <Stack spacing={2}>
              <TextPicker
                label="Nome completo"
                value={detailUser.fullName}
                onChange={() => { }}
                fullWidth
                disabled
              />
              <TextPicker
                label="Login"
                value={detailUser.login}
                onChange={() => { }}
                fullWidth
                disabled
              />
              <MailPicker
                label="E-mail"
                value={detailUser.email}
                onChange={() => { }}
                fullWidth
                disabled
              />
              <MultiSelectPicker
                label="Grupos"
                value={detailUser.groupIds}
                onChange={() => { }}
                options={groupOptions}
                fullWidth
                disabled
                chipDisplay="block"
              />
              <MultiSelectPicker
                label="Funcionalidades permitidas"
                value={detailUser.allowFeatures}
                onChange={() => { }}
                options={featureOptions}
                fullWidth
                disabled
                chipDisplay="block"
              />
              <MultiSelectPicker
                label="Funcionalidades negadas"
                value={detailUser.deniedFeatures}
                onChange={() => { }}
                options={featureOptions}
                fullWidth
                disabled
                chipDisplay="block"
              />
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" className="users-page__label">
                  Criado por
                </Typography>
                <Typography>
                  {detailUser.createdBy} em {new Date(detailUser.createdAt).toLocaleString()}
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary" className="users-page__label">
                  Última atualização
                </Typography>
                <Typography>
                  {detailUser.updatedBy} em {new Date(detailUser.updatedAt).toLocaleString()}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailUser(null)} color="inherit">Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={manageGroupsDialog.open}
        onClose={() => setManageGroupsDialog(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Gerenciar grupos de acessos</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <MultiSelectPicker
              label="Grupos de usuário"
              value={manageGroupsDialog.groupIds}
              onChange={(selected) => {
                const newGroups = selected as string[]
                const newFeatures = mergeGroupFeatures(newGroups, [])
                setManageGroupsDialog(prev => ({
                  ...prev,
                  groupIds: newGroups,
                  allowFeatures: newFeatures
                }))
              }}
              options={groupOptions}
              fullWidth
              placeholder="Selecione um ou mais grupos"
              showSelectAll
              chipDisplay="block"
              disabled={!hasPermission('erp:usuarios:atribuir-grupos')}
            />
            <MultiSelectPicker
              label="Funcionalidades permitidas"
              value={manageGroupsDialog.allowFeatures}
              onChange={() => { }}
              options={featureOptions}
              fullWidth
              placeholder="Funcionalidades carregadas automaticamente"
              chipDisplay="block"
              disabled
            />
            {manageGroupsDialog.groupIds.some((groupId) => {
              const group = groupDictionary[groupId]
              return group?.code === 'ADM-LOJA'
            }) && (
              <MultiSelectPicker
                label="Lojas Gestoras"
                value={manageGroupsDialog.lojasGestoras}
                onChange={(selected) => {
                  setManageGroupsDialog(prev => ({
                    ...prev,
                    lojasGestoras: selected as number[]
                  }))
                }}
                options={lojaOptions}
                fullWidth
                placeholder="Selecione as lojas das quais este usuário é gestor"
                showSelectAll
                chipDisplay="block"
                disabled={!hasPermission('erp:usuarios:atribuir-grupos')}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageGroupsDialog(prev => ({ ...prev, open: false }))} color="inherit" className="button-cancel">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveGroups}
            disabled={!hasPermission('erp:usuarios:atribuir-grupos')}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={manageAccessDialog.open}
        onClose={() => setManageAccessDialog(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Gerenciar acessos particulares</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <MultiSelectPicker
              label="Funcionalidades permitidas"
              value={manageAccessDialog.allowFeatures}
              onChange={(selected) => {
                setManageAccessDialog(prev => ({
                  ...prev,
                  allowFeatures: selected as string[]
                }))
              }}
              options={featureOptions}
              fullWidth
              placeholder="Selecione as funcionalidades permitidas"
              showSelectAll
              chipDisplay="block"
              disabled={!hasPermission('erp:usuarios:atribuir-permissoes-particulares')}
            />
            <MultiSelectPicker
              label="Funcionalidades negadas"
              value={manageAccessDialog.deniedFeatures}
              onChange={(selected) => {
                setManageAccessDialog(prev => ({
                  ...prev,
                  deniedFeatures: selected as string[]
                }))
              }}
              options={featureOptions}
              fullWidth
              placeholder="Selecione as funcionalidades negadas"
              showSelectAll
              chipDisplay="block"
              disabled={!hasPermission('erp:usuarios:atribuir-permissoes-particulares')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageAccessDialog(prev => ({ ...prev, open: false }))} color="inherit" className="button-cancel">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveAccess}
            disabled={!hasPermission('erp:usuarios:atribuir-permissoes-particulares')}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open || Boolean(error)}
        autoHideDuration={4000}
        onClose={() => {
          setToast({ open: false, message: '' })
          setError(null)
        }}
        message={toast.open ? toast.message : error ?? ''}
      />
    </Box>
  )
}

export default UsersPage
