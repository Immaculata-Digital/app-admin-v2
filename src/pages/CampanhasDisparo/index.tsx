import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  CircularProgress,
  Snackbar,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material'
import { Email, Send } from '@mui/icons-material'
import TableCard, {
  type TableCardColumn,
  type TableCardFormField,
  type TableCardRow,
} from '../../components/TableCard'
import { useSearch } from '../../context/SearchContext'
import { useAuth } from '../../context/AuthContext'
import TextPicker from '../../components/TextPicker'
import { EmailEditor } from '../../components/EmailEditor'
import { comunicacoesService, type CampanhaDisparoDTO, type CreateCampanhaDisparoPayload, type UpdateCampanhaDisparoPayload, type RemetenteSmtpDTO } from '../../services/comunicacoes'
import { getTenantSchema } from '../../utils/schema'
import { lojaService } from '../../services/lojas'
import { clienteService } from '../../services/clientes'
import MultiSelectPicker from '../../components/MultiSelectPicker'
import './style.css'

type CampanhaDisparoRow = TableCardRow & CampanhaDisparoDTO

const DEFAULT_USER_ID = 1

const CampanhasDisparoPage = () => {
  const [campanhas, setCampanhas] = useState<CampanhaDisparoRow[]>([])
  const [remetentes, setRemetentes] = useState<RemetenteSmtpDTO[]>([])
  const [lojas, setLojas] = useState<Array<{ id: number; label: string }>>([])
  const [clientes, setClientes] = useState<Array<{ id: number; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [error, setError] = useState<string | null>(null)
  const [emailEditorOpen, setEmailEditorOpen] = useState(false)
  const [currentHtml, setCurrentHtml] = useState<string>('')
  const [htmlUpdateCallback, setHtmlUpdateCallback] = useState<((html: string) => void) | null>(null)
  const [currentCampanhaId, setCurrentCampanhaId] = useState<CampanhaDisparoRow['id'] | null>(null)
  const { setFilters, setPlaceholder, setQuery } = useSearch()
  const { permissions, user } = useAuth()
  const canDelete = permissions.includes('erp:campanhas-disparo:excluir')
  const canEdit = permissions.includes('erp:campanhas-disparo:editar')
  const canCreate = permissions.includes('erp:campanhas-disparo:criar')
  const canView = permissions.includes('erp:campanhas-disparo:visualizar')
  const canList = permissions.includes('erp:campanhas-disparo:listar')

  useEffect(() => {
    setPlaceholder('Buscar campanhas por descrição ou assunto...')
    const filters = [
      { id: 'descricao', label: 'Descrição', field: 'descricao', type: 'text' as const, page: 'campanhas-disparo' },
      { id: 'assunto', label: 'Assunto', field: 'assunto', type: 'text' as const, page: 'campanhas-disparo' },
    ]
    setFilters(filters, 'descricao')
    return () => {
      setFilters([])
      setPlaceholder('')
      setQuery('')
    }
  }, [setFilters, setPlaceholder, setQuery])

  const loadRemetentes = async () => {
    try {
      const data = await comunicacoesService.remetentesSmtp.list(getTenantSchema())
      setRemetentes(data)
    } catch (err: any) {
      console.error('Erro ao carregar remetentes:', err)
    }
  }

  const loadCampanhas = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await comunicacoesService.campanhasDisparo.list(getTenantSchema())
      setCampanhas(data.map(mapCampanhaToRow))
    } catch (err: any) {
      console.error('Erro ao carregar campanhas:', err)
      const errorMessage = err.message || 'Erro ao carregar campanhas de disparo'
      setError(errorMessage)
      setToast({ open: true, message: errorMessage })
      // Se a lista estiver vazia, inicializa como array vazio para não quebrar a renderização
      if (campanhas.length === 0) {
        setCampanhas([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadLojas = async () => {
    try {
      const schema = getTenantSchema()
      const response = await lojaService.list(schema, { limit: 200, offset: 0 })
      setLojas(response.itens.map((loja) => ({ id: loja.id_loja ?? 0, label: loja.nome_loja })))
    } catch (err: any) {
      console.error('Erro ao carregar lojas:', err)
    }
  }

  const loadClientes = async () => {
    try {
      const schema = getTenantSchema()
      const response = await clienteService.list(schema, { limit: 500, offset: 0 })
      setClientes(response.data.map((cliente) => ({ id: cliente.id_cliente, label: cliente.nome_completo })))
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err)
    }
  }

  useEffect(() => {
    if (canList) {
      loadRemetentes()
      loadCampanhas()
      loadLojas()
      loadClientes()
    }
  }, [canList])

  const mapCampanhaToRow = (campanha: CampanhaDisparoDTO): CampanhaDisparoRow => ({
    ...campanha,
    id: campanha.id_campanha,
  })

  const columns: TableCardColumn<CampanhaDisparoRow>[] = useMemo(
    () => [
      {
        key: 'descricao',
        label: 'Descrição',
      },
      {
        key: 'assunto',
        label: 'Assunto',
      },
      {
        key: 'tipo_envio',
        label: 'Tipo de Envio',
        render: (value) => value === 'manual' ? 'Manual' : 'Agendado',
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => {
          const statusMap: Record<string, string> = {
            rascunho: 'Rascunho',
            agendada: 'Agendada',
            enviando: 'Enviando',
            concluida: 'Concluída',
            cancelada: 'Cancelada',
          }
          return statusMap[value as string] || value
        },
      },
      {
        key: 'total_enviados',
        label: 'Enviados',
      },
    ],
    []
  )

  const formFields: TableCardFormField<CampanhaDisparoRow>[] = useMemo(
    () => [
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
            disabled={disabled}
          />
        ),
      },
      {
        key: 'assunto',
        label: 'Assunto',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <TextPicker
            label="Assunto"
            value={typeof value === 'string' ? value : ''}
            onChange={(text) => onChange(text)}
            fullWidth
            disabled={disabled}
          />
        ),
      },
      {
        key: 'html',
        label: 'Conteúdo HTML',
        required: true,
        renderInput: ({ value, onChange, disabled, formValues }) => {
          return (
            <Button
              variant="outlined"
              startIcon={<Email />}
              onClick={() => {
                // Sempre atualizar currentHtml com o valor atual do campo antes de abrir
                const currentValue = typeof value === 'string' ? value : ''
                setCurrentHtml(currentValue)
                // Detectar se estamos editando (se há um ID no formValues)
                const campanhaId = formValues?.id || null
                setCurrentCampanhaId(campanhaId)
                setHtmlUpdateCallback(() => (html: string) => {
                  onChange(html)
                })
                setEmailEditorOpen(true)
              }}
              disabled={disabled}
              fullWidth
            >
              Estilizar Email
            </Button>
          )
        },
      },
      {
        key: 'remetente_id',
        label: 'Remetente',
        required: true,
        renderInput: ({ value, onChange, disabled }) => (
          <FormControl fullWidth disabled={disabled}>
            <InputLabel>Remetente</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              label="Remetente"
            >
              {remetentes.map((remetente) => (
                <MenuItem key={remetente.id_remetente} value={remetente.id_remetente}>
                  {remetente.nome} ({remetente.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      },
      {
        key: 'tipo_envio',
        label: 'Tipo de Envio',
        required: true,
        renderInput: ({ value, onChange, disabled }) => {
          const tipoEnvio = value || 'manual'
          return (
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Tipo de Envio</InputLabel>
              <Select
                value={tipoEnvio}
                onChange={(e) => onChange(e.target.value)}
                label="Tipo de Envio"
              >
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="agendado">Agendado</MenuItem>
              </Select>
            </FormControl>
          )
        },
      },
      {
        key: 'data_agendamento',
        label: 'Data de Agendamento',
        required: false,
        renderInput: ({ value, onChange, disabled, formValues }) => {
          const tipoEnvio = formValues?.tipo_envio || 'manual'
          // Só mostrar o campo se o tipo de envio for agendado
          if (tipoEnvio !== 'agendado') {
            return null
          }
          
          // Converter data para formato de input (YYYY-MM-DDTHH:mm)
          let dateValue = ''
          if (value) {
            if (typeof value === 'string') {
              // Se já está no formato correto ou precisa converter
              dateValue = value.includes('T') 
                ? value.substring(0, 16) 
                : new Date(value).toISOString().substring(0, 16)
            } else {
              dateValue = new Date(value).toISOString().substring(0, 16)
            }
          }
          
          return (
            <TextPicker
              label="Data de Agendamento"
              value={dateValue}
              onChange={(text) => onChange(text)}
              fullWidth
              type="text"
              disabled={disabled}
              placeholder="YYYY-MM-DDTHH:mm"
            />
          )
        },
      },
      {
        key: 'tipo_destinatario',
        label: 'Destinatários',
        required: true,
        renderInput: ({ value, onChange, disabled, formValues, setFieldValue }) => {
          const tipoDestinatario = value || 'todos'
          return (
            <Box>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Destinatários</InputLabel>
                <Select
                  value={tipoDestinatario}
                  onChange={(e) => {
                    onChange(e.target.value)
                    // Limpar seleções quando mudar o tipo
                    if (e.target.value !== 'lojas_especificas') {
                      setFieldValue('lojas_ids', null)
                    }
                    if (e.target.value !== 'clientes_especificos') {
                      setFieldValue('clientes_ids', null)
                    }
                  }}
                  label="Destinatários"
                >
                  <MenuItem value="todos">Todos os clientes</MenuItem>
                  <MenuItem value="lojas_especificas">Clientes de lojas específicas</MenuItem>
                  <MenuItem value="clientes_especificos">Clientes específicos</MenuItem>
                </Select>
              </FormControl>
              
              {tipoDestinatario === 'lojas_especificas' && (
                <Box sx={{ mt: 2 }}>
                  <MultiSelectPicker
                    label="Selecione as Lojas"
                    value={formValues?.lojas_ids ? (typeof formValues.lojas_ids === 'string' ? formValues.lojas_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []) : []}
                    onChange={(selectedIds) => {
                      const idsString = selectedIds.length > 0 ? selectedIds.join(',') : null
                      setFieldValue('lojas_ids', idsString)
                    }}
                    options={lojas.map(loja => ({ value: loja.id, label: loja.label }))}
                    fullWidth
                    disabled={disabled}
                    placeholder="Selecione as lojas"
                  />
                </Box>
              )}
              
              {tipoDestinatario === 'clientes_especificos' && (
                <Box sx={{ mt: 2 }}>
                  <MultiSelectPicker
                    label="Selecione os Clientes"
                    value={formValues?.clientes_ids ? (typeof formValues.clientes_ids === 'string' ? formValues.clientes_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []) : []}
                    onChange={(selectedIds) => {
                      const idsString = selectedIds.length > 0 ? selectedIds.join(',') : null
                      setFieldValue('clientes_ids', idsString)
                    }}
                    options={clientes.map(cliente => ({ value: cliente.id, label: cliente.label }))}
                    fullWidth
                    disabled={disabled}
                    placeholder="Selecione os clientes"
                    searchable
                  />
                </Box>
              )}
            </Box>
          )
        },
      },
    ],
    [remetentes, lojas, clientes]
  )

  const handleCreate = useCallback(
    async (formData: Partial<CampanhaDisparoRow>) => {
      try {
        const tipoEnvio = (formData.tipo_envio as 'manual' | 'agendado') ?? 'manual'
        const payload: CreateCampanhaDisparoPayload = {
          tipo: 'email',
          descricao: (formData.descricao as string) ?? '',
          assunto: (formData.assunto as string) ?? '',
          html: (formData.html as string) ?? '',
          remetente_id: (formData.remetente_id as string) ?? '',
          tipo_envio: tipoEnvio,
          data_agendamento: tipoEnvio === 'agendado' && formData.data_agendamento 
            ? (formData.data_agendamento as string)
            : null,
          tipo_destinatario: (formData.tipo_destinatario as 'todos' | 'lojas_especificas' | 'clientes_especificos') || 'todos',
          lojas_ids: formData.tipo_destinatario === 'lojas_especificas' ? (formData.lojas_ids as string | null) || null : null,
          clientes_ids: formData.tipo_destinatario === 'clientes_especificos' ? (formData.clientes_ids as string | null) || null : null,
          usu_cadastro: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
        }
        await comunicacoesService.campanhasDisparo.create(getTenantSchema(), payload)
        setToast({ open: true, message: 'Campanha criada com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao criar campanha' })
        throw err
      }
    },
    [user]
  )

  const handleUpdate = useCallback(
    async (id: CampanhaDisparoRow['id'], formData: Partial<CampanhaDisparoRow>) => {
      try {
        const tipoEnvio = formData.tipo_envio as 'manual' | 'agendado' | undefined
        const tipoDestinatario = formData.tipo_destinatario as 'todos' | 'lojas_especificas' | 'clientes_especificos' | undefined
        const payload: UpdateCampanhaDisparoPayload = {
          descricao: formData.descricao as string | undefined,
          assunto: formData.assunto as string | undefined,
          html: formData.html as string | undefined,
          remetente_id: formData.remetente_id as string | undefined,
          tipo_envio: tipoEnvio,
          data_agendamento: tipoEnvio === 'agendado' && formData.data_agendamento
            ? (formData.data_agendamento as string)
            : (tipoEnvio === 'manual' ? null : formData.data_agendamento as string | null | undefined),
          status: formData.status as any,
          tipo_destinatario: tipoDestinatario,
          lojas_ids: tipoDestinatario === 'lojas_especificas' ? (formData.lojas_ids as string | null) || null : (tipoDestinatario !== 'lojas_especificas' ? null : undefined),
          clientes_ids: tipoDestinatario === 'clientes_especificos' ? (formData.clientes_ids as string | null) || null : (tipoDestinatario !== 'clientes_especificos' ? null : undefined),
          usu_altera: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
        }
        await comunicacoesService.campanhasDisparo.update(getTenantSchema(), String(id), payload)
        setToast({ open: true, message: 'Campanha atualizada com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao atualizar campanha' })
        throw err
      }
    },
    [user]
  )

  const handleDelete = useCallback(
    async (id: CampanhaDisparoRow['id']) => {
      try {
        await comunicacoesService.campanhasDisparo.delete(getTenantSchema(), String(id))
        setToast({ open: true, message: 'Campanha excluída com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao excluir campanha' })
        throw err
      }
    },
    []
  )

  const handleEnviar = useCallback(
    async (row: CampanhaDisparoRow) => {
      try {
        await comunicacoesService.campanhasDisparo.enviar(getTenantSchema(), String(row.id_campanha))
        setToast({ open: true, message: 'Campanha enviada com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        setToast({ open: true, message: err.message || 'Erro ao enviar campanha' })
      }
    },
    []
  )

  const rowActions = useMemo(() => {
    return campanhas
      .filter((row) => row.tipo_envio === 'manual')
      .map((row) => ({
        label: 'Enviar',
        icon: <Send />,
        onClick: () => handleEnviar(row),
      }))
  }, [campanhas, handleEnviar])

  if (!canList) {
    return (
      <Box className="campanhas-disparo-page">
        <Typography variant="h6" color="error">
          Você não tem permissão para visualizar esta página.
        </Typography>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box className="campanhas-disparo-page" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="campanhas-disparo-page">
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}
      <TableCard
        title="Campanhas de Disparo"
        rows={campanhas}
        columns={columns}
        formFields={formFields}
        onAdd={canCreate ? handleCreate : undefined}
        onEdit={canEdit ? handleUpdate : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        disableView={!canView}
        rowActions={(row: CampanhaDisparoRow) => {
          if (row.tipo_envio === 'manual') {
            return [
              {
                label: 'Enviar',
                icon: <Send />,
                onClick: () => handleEnviar(row),
              },
            ]
          }
          return []
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
      />

      <EmailEditor
        open={emailEditorOpen}
        onClose={() => {
          setEmailEditorOpen(false)
          setHtmlUpdateCallback(null)
          setCurrentCampanhaId(null)
        }}
        onSave={async (html) => {
          try {
            // Se estamos editando uma campanha existente, atualizar diretamente no banco
            if (currentCampanhaId && canEdit) {
              await comunicacoesService.campanhasDisparo.update(
                getTenantSchema(),
                String(currentCampanhaId),
                {
                  html,
                  usu_altera: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
                }
              )
              setToast({ open: true, message: 'HTML atualizado com sucesso!' })
              await loadCampanhas()
            }
            
            // Atualizar o formulário também
            if (htmlUpdateCallback) {
              htmlUpdateCallback(html)
              setCurrentHtml(html)
              setHtmlUpdateCallback(null)
            }
            setCurrentCampanhaId(null)
            setEmailEditorOpen(false)
          } catch (err: any) {
            setToast({ open: true, message: err.message || 'Erro ao atualizar HTML' })
            // Mesmo com erro, fechar o editor e atualizar o formulário
            if (htmlUpdateCallback) {
              htmlUpdateCallback(html)
              setCurrentHtml(html)
              setHtmlUpdateCallback(null)
            }
            setCurrentCampanhaId(null)
            setEmailEditorOpen(false)
          }
        }}
        initialHtml={currentHtml}
      />
    </Box>
  )
}

export default CampanhasDisparoPage

