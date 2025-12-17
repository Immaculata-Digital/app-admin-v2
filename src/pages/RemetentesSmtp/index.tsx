import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  CircularProgress,
  Snackbar,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
} from '../../components/TableCard'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import TextPicker from '../../components/TextPicker'
import { comunicacoesService, type RemetenteSmtpDTO, type CreateRemetenteSmtpPayload, type UpdateRemetenteSmtpPayload } from '../../services/comunicacoes'
import { getTenantSchema } from '../../utils/schema'
import './style.css'

type RemetenteSmtpRow = TableCardRow & RemetenteSmtpDTO

const DEFAULT_USER_ID = 1

const RemetentesSmtpPage = () => {
  const [remetentes, setRemetentes] = useState<RemetenteSmtpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions, user } = useAuth()
  const canDelete = permissions.includes('erp:remetentes-smtp:excluir')
  const canEdit = permissions.includes('erp:remetentes-smtp:editar')
  const canCreate = permissions.includes('erp:remetentes-smtp:criar')
  const canView = permissions.includes('erp:remetentes-smtp:visualizar')
  const canList = permissions.includes('erp:remetentes-smtp:listar')

  useEffect(() => {
    setPlaceholder('Buscar remetentes por nome ou email...')
    const filters = [
      { id: 'nome', label: 'Nome', field: 'nome', type: 'text' as const, page: 'remetentes-smtp' },
      { id: 'email', label: 'Email', field: 'email', type: 'text' as const, page: 'remetentes-smtp' },
    ]
    setFilters(filters, 'nome')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const loadRemetentes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await comunicacoesService.remetentesSmtp.list(getTenantSchema())
      setRemetentes(data.map(mapRemetenteToRow))
    } catch (err: any) {
      console.error('Erro ao carregar remetentes:', err)
      const errorMessage = err.message || 'Erro ao carregar remetentes SMTP'
      setError(errorMessage)
      setToast({ open: true, message: errorMessage })
      if (remetentes.length === 0) {
        setRemetentes([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canList) {
      loadRemetentes()
    }
  }, [canList])

  const mapRemetenteToRow = (remetente: RemetenteSmtpDTO): RemetenteSmtpRow => ({
    ...remetente,
    id: remetente.id_remetente,
  })

  const columns: TableCardColumn<RemetenteSmtpRow>[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome',
      },
      {
        key: 'email',
        label: 'Email',
      },
      {
        key: 'smtp_host',
        label: 'Host SMTP',
      },
      {
        key: 'smtp_port',
        label: 'Porta',
      },
      {
        key: 'smtp_secure',
        label: 'Conexão Segura',
        render: (value) => value ? 'Sim' : 'Não',
      },
    ],
    []
  )

  const formFields: TableCardFormField<RemetenteSmtpRow>[] = useMemo(
    () => [
      {
        key: 'nome',
        label: 'Nome',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Nome"
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
          <TextPicker
            label="Email"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            type="email"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'senha',
        label: 'Senha',
        required: true,
        renderInput: ({ value, onChange, disabled, isEditMode }) => (
          <TextPicker
            label="Senha"
            value={isEditMode ? '' : (typeof value === 'string' ? value : '')}
            onChange={(text) => onChange(text)}
            fullWidth
            type="password"
            disabled={disabled}
            placeholder={isEditMode ? 'Deixe em branco para manter a senha atual' : 'Digite a senha'}
            helperText={isEditMode ? 'Deixe em branco para manter a senha atual' : undefined}
          />
        ),
      },
      {
        key: 'smtp_host',
        label: 'Host SMTP',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Host SMTP"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'smtp_port',
        label: 'Porta SMTP',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Porta SMTP"
            value={typeof value === 'number' ? value.toString() : (typeof value === 'string' ? value : '')}
            onChange={(text) => onChange(parseInt(text) || 587)}
            fullWidth
            type="number"
            disabled={disabled}
          />
        ),
      },
      {
        key: 'smtp_secure',
        label: 'Conexão Segura (TLS)',
        required: true,
        renderInput: ({ value, onChange, disabled }) => {
          const isSecure = value === true || value === 'true' || value === 1
          return (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={isSecure}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Conexão Segura (TLS)"
              />
              <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                {isSecure ? 'Sim - Usar conexão segura (TLS/SSL)' : 'Não - Usar conexão não segura'}
              </Typography>
            </Box>
          )
        },
      },
    ],
    []
  )

  const handleCreate = useCallback(
    async (formData: Partial<RemetenteSmtpRow>) => {
      try {
        const payload: CreateRemetenteSmtpPayload = {
          nome: (formData.nome as string) ?? '',
          email: (formData.email as string) ?? '',
          senha: (formData.senha as string) ?? '',
          smtp_host: (formData.smtp_host as string) ?? '',
          smtp_port: typeof formData.smtp_port === 'number' ? formData.smtp_port : parseInt(String(formData.smtp_port || 587)),
          smtp_secure: formData.smtp_secure === true || (typeof formData.smtp_secure === 'string' && formData.smtp_secure === 'true') || (typeof formData.smtp_secure === 'number' && formData.smtp_secure === 1),
          usu_cadastro: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
        }
        await comunicacoesService.remetentesSmtp.create(getTenantSchema(), payload)
        setToast({ open: true, message: 'Remetente criado com sucesso!' })
        await loadRemetentes()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao criar remetente' })
        throw err
      }
    },
    [user]
  )

  const handleUpdate = useCallback(
    async (id: RemetenteSmtpRow['id'], formData: Partial<RemetenteSmtpRow>) => {
      try {
        const payload: UpdateRemetenteSmtpPayload = {
          nome: formData.nome as string | undefined,
          email: formData.email as string | undefined,
          senha: formData.senha && String(formData.senha).trim() !== '' ? (formData.senha as string) : undefined,
          smtp_host: formData.smtp_host as string | undefined,
          smtp_port: typeof formData.smtp_port === 'number' ? formData.smtp_port : (formData.smtp_port ? parseInt(String(formData.smtp_port)) : undefined),
          smtp_secure: formData.smtp_secure === true || (typeof formData.smtp_secure === 'string' && formData.smtp_secure === 'true') || (typeof formData.smtp_secure === 'number' && formData.smtp_secure === 1),
          usu_altera: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
        }
        await comunicacoesService.remetentesSmtp.update(getTenantSchema(), String(id), payload)
        setToast({ open: true, message: 'Remetente atualizado com sucesso!' })
        await loadRemetentes()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao atualizar remetente' })
        throw err
      }
    },
    [user]
  )

  const handleDelete = useCallback(
    async (id: RemetenteSmtpRow['id']) => {
      try {
        await comunicacoesService.remetentesSmtp.delete(getTenantSchema(), String(id))
        setToast({ open: true, message: 'Remetente excluído com sucesso!' })
        await loadRemetentes()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao excluir remetente' })
        throw err
      }
    },
    []
  )

  if (!canList) {
    return (
      <Box className="remetentes-smtp-page">
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box className="remetentes-smtp-page" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="remetentes-smtp-page">
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}
      <TableCard
        title="Remetentes SMTP"
        rows={remetentes}
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

export default RemetentesSmtpPage
