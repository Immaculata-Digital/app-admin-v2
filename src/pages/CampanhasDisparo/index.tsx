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
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ptBR } from 'date-fns/locale'
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
  
  // Função auxiliar para verificar se a campanha pode ser excluída
  const canDeleteCampanha = (campanha: CampanhaDisparoRow) => {
    return canDelete && campanha.cliente_pode_excluir !== false
  }
  
  // Função auxiliar para verificar se é uma campanha especial (padrão do sistema)
  const isCampanhaEspecial = (campanha: CampanhaDisparoRow | null | undefined) => {
    if (!campanha) return false
    // Verificar se tem o campo cliente_pode_excluir e se é false
    return campanha.cliente_pode_excluir === false
  }
  
  // Função auxiliar para buscar campanha por ID
  const getCampanhaById = (id: CampanhaDisparoRow['id'] | null | undefined): CampanhaDisparoRow | null => {
    if (!id) return null
    return campanhas.find(c => c.id === id) || null
  }

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
        render: (value) => {
          const tipoMap: Record<string, string> = {
            manual: 'Manual',
            agendado: 'Agendado',
            boas_vindas: 'Boas Vindas',
            atualizacao_pontos: 'Atualização de Pontos',
            resgate: 'Resgate',
            reset_senha: 'Reset de Senha',
          }
          return tipoMap[value as string] || value
        },
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
        renderInput: ({ value, onChange, disabled, formValues }) => {
          // Buscar a campanha original pelo ID se estiver editando
          const campanhaOriginal = formValues?.id ? getCampanhaById(formValues.id) : null
          const isEspecial = isCampanhaEspecial(campanhaOriginal || formValues as CampanhaDisparoRow | null)
          return (
            <TextPicker
              label="Descrição"
              value={typeof value === 'string' ? value : ''}
              onChange={(text) => onChange(text)}
              fullWidth
              disabled={disabled || isEspecial}
              helperText={isEspecial ? 'Esta campanha é padrão do sistema e não pode ser editada' : ''}
            />
          )
        },
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
          <FormControl fullWidth disabled={disabled} required error={!value}>
            <InputLabel required error={!value}>Remetente *</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              label="Remetente *"
              error={!value}
            >
              {remetentes.map((remetente) => (
                <MenuItem key={remetente.id_remetente} value={remetente.id_remetente}>
                  {remetente.nome} ({remetente.email})
                </MenuItem>
              ))}
            </Select>
            {!value && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                O campo remetente é obrigatório e não pode estar vazio
              </Typography>
            )}
          </FormControl>
        ),
      },
      {
        key: 'tipo_envio',
        label: 'Tipo de Envio',
        required: true,
        renderInput: ({ value, onChange, disabled, formValues, setFieldValue, isEditMode }) => {
          const tipoEnvio = value || 'manual'
          const tiposAutomaticos = ['boas_vindas', 'atualizacao_pontos', 'resgate', 'reset_senha', 'resgate_nao_retirar_loja']
          // Buscar a campanha original pelo ID se estiver editando
          const campanhaOriginal = formValues?.id ? getCampanhaById(formValues.id) : null
          const isEspecial = isCampanhaEspecial(campanhaOriginal || formValues as CampanhaDisparoRow | null)
          // Só mostrar tipos padrão se estiver editando uma campanha que já é padrão
          // Ao criar nova campanha, os tipos padrão não devem aparecer
          const mostrarTiposPadrao = isEditMode && campanhaOriginal && isEspecial
          return (
            <FormControl fullWidth disabled={disabled || isEspecial}>
              <InputLabel>Tipo de Envio</InputLabel>
              <Select
                value={tipoEnvio}
                onChange={(e) => {
                  if (isEspecial) {
                    // Não permitir alteração se for campanha especial
                    return
                  }
                  onChange(e.target.value)
                  const novoTipo = e.target.value
                  // Se mudou para tipo automático, limpar data de agendamento e destinatários
                  if (tiposAutomaticos.includes(novoTipo)) {
                    setFieldValue('data_agendamento', null)
                    setFieldValue('tipo_destinatario', 'todos')
                    setFieldValue('lojas_ids', null)
                    setFieldValue('clientes_ids', null)
                  }
                }}
                label="Tipo de Envio"
              >
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="agendado">Agendado</MenuItem>
                {/* Só mostrar tipos padrão se estiver editando uma campanha que já é padrão */}
                {mostrarTiposPadrao && (
                  <>
                    <MenuItem value="boas_vindas">Boas Vindas</MenuItem>
                    <MenuItem value="atualizacao_pontos">Atualização de Pontos</MenuItem>
                    <MenuItem value="resgate">Resgate</MenuItem>
                    <MenuItem value="reset_senha">Reset de Senha</MenuItem>
                  </>
                )}
              </Select>
              {isEspecial && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                  Esta campanha é padrão do sistema e não pode ser alterada
                </Typography>
              )}
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
          // Só mostrar o campo se o tipo de envio for agendado (não mostrar para tipos automáticos)
          const tiposAutomaticos = ['boas_vindas', 'atualizacao_pontos', 'resgate', 'reset_senha', 'resgate_nao_retirar_loja']
          if (tipoEnvio !== 'agendado' || tiposAutomaticos.includes(tipoEnvio as string)) {
            return null
          }

          // Converter valor para Date object ou null
          let dateValue: Date | null = null
          if (value) {
            if (typeof value === 'string') {
              dateValue = new Date(value)
              if (isNaN(dateValue.getTime())) {
                dateValue = null
              }
            } else if (value instanceof Date) {
              dateValue = value
            }
          }
          
          return (
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DateTimePicker
                label="Data de Agendamento"
                value={dateValue}
                onChange={(newValue) => {
                  if (newValue) {
                    // Converter para ISO string
                    onChange(newValue.toISOString())
                  } else {
                    onChange(null)
                  }
                }}
                disabled={disabled}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                  },
                }}
                format="dd/MM/yyyy HH:mm"
              />
            </LocalizationProvider>
          )
        },
      },
      {
        key: 'tipo_destinatario',
        label: 'Destinatários',
        required: true,
        renderInput: ({ value, onChange, disabled, formValues, setFieldValue }) => {
          const tipoEnvio = formValues?.tipo_envio || 'manual'
          // Não mostrar destinatários para tipos automáticos
          const tiposAutomaticos = ['boas_vindas', 'atualizacao_pontos', 'resgate', 'reset_senha', 'resgate_nao_retirar_loja']
          if (tiposAutomaticos.includes(tipoEnvio as string)) {
            return null
          }
          
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
        const tipoEnvio = (formData.tipo_envio as 'manual' | 'agendado' | 'boas_vindas' | 'atualizacao_pontos' | 'resgate' | 'reset_senha' | 'resgate_nao_retirar_loja') ?? 'manual'
        const tiposAutomaticos = ['boas_vindas', 'atualizacao_pontos', 'resgate', 'reset_senha', 'resgate_nao_retirar_loja']
        const isTipoAutomatico = tiposAutomaticos.includes(tipoEnvio)
        
        const payload: CreateCampanhaDisparoPayload = {
          tipo: 'email',
          descricao: (formData.descricao as string) ?? '',
          assunto: (formData.assunto as string) ?? '',
          html: (formData.html as string) ?? '',
          remetente_id: (formData.remetente_id as string) ?? '',
          tipo_envio: tipoEnvio,
          data_agendamento: (tipoEnvio === 'agendado' && formData.data_agendamento && !isTipoAutomatico)
            ? (formData.data_agendamento as string)
            : null,
          tipo_destinatario: isTipoAutomatico ? 'todos' : ((formData.tipo_destinatario as 'todos' | 'lojas_especificas' | 'clientes_especificos') || 'todos'),
          lojas_ids: isTipoAutomatico ? null : (formData.tipo_destinatario === 'lojas_especificas' ? (formData.lojas_ids as string | null) || null : null),
          clientes_ids: isTipoAutomatico ? null : (formData.tipo_destinatario === 'clientes_especificos' ? (formData.clientes_ids as string | null) || null : null),
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
        // Buscar a campanha original para verificar se é especial
        const campanhaOriginal = getCampanhaById(id)
        const isEspecial = isCampanhaEspecial(campanhaOriginal)
        
        if (isEspecial) {
          // Bloquear alteração de tipo_envio e descricao para campanhas especiais
          if (formData.tipo_envio !== undefined && formData.tipo_envio !== campanhaOriginal?.tipo_envio) {
            setToast({ open: true, message: 'Não é possível alterar o tipo de envio de campanhas padrão do sistema' })
            throw new Error('Não é possível alterar o tipo de envio de campanhas padrão do sistema')
          }
          if (formData.descricao !== undefined && formData.descricao !== campanhaOriginal?.descricao) {
            setToast({ open: true, message: 'Não é possível alterar a descrição de campanhas padrão do sistema' })
            throw new Error('Não é possível alterar a descrição de campanhas padrão do sistema')
          }
        }
        
        const tipoEnvio = formData.tipo_envio as 'manual' | 'agendado' | 'boas_vindas' | 'atualizacao_pontos' | 'resgate' | 'reset_senha' | 'resgate_nao_retirar_loja' | undefined
        const tiposAutomaticos = ['boas_vindas', 'atualizacao_pontos', 'resgate', 'reset_senha', 'resgate_nao_retirar_loja']
        const isTipoAutomatico = tipoEnvio && tiposAutomaticos.includes(tipoEnvio)
        const tipoDestinatario = formData.tipo_destinatario as 'todos' | 'lojas_especificas' | 'clientes_especificos' | undefined
        
        const payload: UpdateCampanhaDisparoPayload = {
          // Para campanhas especiais, manter os valores originais de tipo_envio e descricao
          // Para campanhas normais, permitir alterações
          descricao: isEspecial ? campanhaOriginal?.descricao : (formData.descricao as string | undefined),
          tipo_envio: isEspecial ? campanhaOriginal?.tipo_envio : tipoEnvio,
          assunto: formData.assunto as string | undefined,
          html: formData.html as string | undefined,
          remetente_id: formData.remetente_id as string | undefined,
          data_agendamento: tipoEnvio === 'agendado' && formData.data_agendamento
            ? (formData.data_agendamento as string)
            : (tipoEnvio === 'manual' ? null : formData.data_agendamento as string | null | undefined),
          status: formData.status as any,
          tipo_destinatario: isTipoAutomatico ? 'todos' : tipoDestinatario,
          lojas_ids: isTipoAutomatico ? null : (tipoDestinatario === 'lojas_especificas' ? (formData.lojas_ids as string | null) || null : null),
          clientes_ids: isTipoAutomatico ? null : (tipoDestinatario === 'clientes_especificos' ? (formData.clientes_ids as string | null) || null : null),
          usu_altera: user?.id ? parseInt(user.id) : DEFAULT_USER_ID,
        }
        await comunicacoesService.campanhasDisparo.update(getTenantSchema(), String(id), payload)
        setToast({ open: true, message: 'Campanha atualizada com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        if (!err.message?.includes('Não é possível')) {
          setToast({ open: true, message: err.message || 'Erro ao atualizar campanha' })
        }
        throw err
      }
    },
    [user, campanhas]
  )

  const handleDelete = useCallback(
    async (id: CampanhaDisparoRow['id']) => {
      try {
        const campanha = getCampanhaById(id)
        if (!campanha) {
          setToast({ open: true, message: 'Campanha não encontrada' })
          return
        }
        
        if (!canDeleteCampanha(campanha)) {
          setToast({ open: true, message: 'Esta campanha não pode ser excluída pois é padrão do sistema' })
          throw new Error('Esta campanha não pode ser excluída pois é padrão do sistema')
        }
        
        await comunicacoesService.campanhasDisparo.delete(getTenantSchema(), String(id))
        setToast({ open: true, message: 'Campanha excluída com sucesso!' })
        await loadCampanhas()
      } catch (err: any) {
        if (!err.message?.includes('não pode ser excluída')) {
          setToast({ open: true, message: err.message || 'Erro ao excluir campanha' })
        }
        throw err
      }
    },
    [campanhas]
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
        canDeleteRow={canDeleteCampanha}
        disableView={!canView}
        rowActions={(row: CampanhaDisparoRow) => {
          if (row.tipo_envio === 'manual' || row.tipo_envio === 'agendado') {
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

