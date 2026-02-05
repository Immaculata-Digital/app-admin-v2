import { useState, useEffect } from 'react'
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Grid, TextField, Typography, Snackbar, MenuItem, InputAdornment } from '@mui/material'
import { Upload, Palette, TextFields, RestartAlt, Delete, QrCode2, Description } from '@mui/icons-material'
import { configuracoesService, type ConfiguracaoGlobal, type ConfiguracaoUpdate, type ConfiguracaoCreate } from '../../services/configuracoes'
import { getTenantSchema } from '../../utils/schema'
import { useAuth } from '../../context/AuthContext'
import { downloadQRCodeClienteRegistroPNG } from '../../utils/qrcode.utils'
import './style.css'

// Opções de fontes disponíveis
const FONTE_OPTIONS = [
  { value: 'Arial', label: 'Arial', category: 'Padrão' },
  { value: 'Helvetica', label: 'Helvetica', category: 'Padrão' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'Padrão' },
  { value: 'Georgia', label: 'Georgia', category: 'Padrão' },
  { value: 'Courier New', label: 'Courier New', category: 'Padrão' },
  { value: 'Verdana', label: 'Verdana', category: 'Padrão' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', category: 'Padrão' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS', category: 'Padrão' },
  { value: 'Impact', label: 'Impact', category: 'Padrão' },
  { value: 'Roboto', label: 'Roboto', category: 'Google Fonts' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Google Fonts' },
  { value: 'Poppins', label: 'Poppins', category: 'Google Fonts' },
]

const ConfiguracoesPage = () => {
  const { user } = useAuth()
  const [configuracao, setConfiguracao] = useState<ConfiguracaoGlobal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const [formData, setFormData] = useState<ConfiguracaoUpdate>({
    cor_fundo: '',
    cor_card: '',
    cor_texto_card: '',
    cor_valor_card: '',
    cor_botao: '',
    cor_texto_botao: '',
    fonte_titulos: '',
    fonte_textos: '',
    arquivo_politica_privacidade: '',
    arquivo_termos_uso: '',
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<string | null>(null)
  const [politicaFile, setPoliticaFile] = useState<string | null>(null)
  const [termosFile, setTermosFile] = useState<string | null>(null)
  const [politicaNome, setPoliticaNome] = useState<string | null>(null)
  const [termosNome, setTermosNome] = useState<string | null>(null)

  useEffect(() => {
    loadConfiguracao()
  }, [])

  useEffect(() => {
    if (configuracao) {
      setFormData({
        cor_fundo: configuracao.cor_fundo || '',
        cor_card: configuracao.cor_card || '',
        cor_texto_card: configuracao.cor_texto_card || '',
        cor_valor_card: configuracao.cor_valor_card || '',
        cor_botao: configuracao.cor_botao || '',
        cor_texto_botao: configuracao.cor_texto_botao || '',
        fonte_titulos: configuracao.fonte_titulos || '',
        fonte_textos: configuracao.fonte_textos || '',
        // arquivo_politica_privacidade e arquivo_termos_uso não são carregados no formData para evitar payload gigante
        // eles só serão enviados se houver upload de um novo arquivo (politicaFile/termosFile)
      })
      if (configuracao.logo_base64) {
        setLogoPreview(configuracao.logo_base64)
      }
      if (configuracao.arquivo_politica_privacidade) {
        setPoliticaNome('Politica_de_Privacidade.pdf')
      }
      if (configuracao.arquivo_termos_uso) {
        setTermosNome('Termos_de_Uso.pdf')
      }
    }
  }, [configuracao])

  const loadConfiguracao = async () => {
    try {
      setLoading(true)
      const config = await configuracoesService.getFirst(getTenantSchema())
      setConfiguracao(config)
    } catch (err: any) {
      console.error(err)
      setToast({ open: true, message: err.message || 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setToast({ open: true, message: 'Por favor, selecione uma imagem válida' })
      return
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setToast({ open: true, message: 'A imagem deve ter no máximo 2MB' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setLogoFile(base64)
    }
    reader.readAsDataURL(file)
  }

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'politica' | 'termos') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      setToast({ open: true, message: 'Por favor, selecione um arquivo PDF válido' })
      return
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ open: true, message: 'O arquivo deve ter no máximo 5MB' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      if (type === 'politica') {
        setPoliticaFile(base64)
        setPoliticaNome(file.name)
      } else {
        setTermosFile(base64)
        setTermosNome(file.name)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteLogo = async () => {
    await handleDeleteFile('logo')
  }

  const handleDeleteFile = async (type: 'logo' | 'politica' | 'termos') => {
    if (!user?.id) {
      setToast({ open: true, message: 'Usuário não autenticado' })
      return
    }

    if (!configuracao?.id_config_global) {
      // Se não há configuração, apenas limpa o preview local
      if (type === 'logo') {
        setLogoPreview(null)
        setLogoFile(null)
      } else if (type === 'politica') {
        setPoliticaNome(null)
        setPoliticaFile(null)
      } else {
        setTermosNome(null)
        setTermosFile(null)
      }
      setToast({ open: true, message: 'Arquivo removido' })
      return
    }

    try {
      setSaving(true)
      const dataToSend: ConfiguracaoUpdate = {
        ...formData,
      }

      if (type === 'logo') dataToSend.logo_base64 = null
      if (type === 'politica') dataToSend.arquivo_politica_privacidade = null
      if (type === 'termos') dataToSend.arquivo_termos_uso = null

      const updated = await configuracoesService.update(
        getTenantSchema(),
        configuracao.id_config_global,
        dataToSend
      )

      setConfiguracao(updated)

      if (type === 'logo') {
        setLogoPreview(null)
        setLogoFile(null)
      } else if (type === 'politica') {
        setPoliticaNome(null)
        setPoliticaFile(null)
      } else {
        setTermosNome(null)
        setTermosFile(null)
      }

      setToast({
        open: true,
        message: 'Arquivo excluído com sucesso',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        message: err.message || 'Erro ao excluir arquivo',
      })
    } finally {
      setSaving(false)
    }
  }

  // Valores padrão de fábrica
  const DEFAULT_VALUES = {
    cor_fundo: '#f8fafc',
    cor_card: '#ffffff',
    cor_texto_card: '#000000',
    cor_valor_card: '#000000',
    cor_botao: '#3b82f6',
    cor_texto_botao: '#ffffff',
    fonte_titulos: 'Arial',
    fonte_textos: 'Arial',
  }

  const handleResetToDefault = async () => {
    if (!user?.id) {
      setToast({ open: true, message: 'Usuário não autenticado' })
      return
    }

    if (!configuracao?.id_config_global) {
      setToast({ open: true, message: 'Não há configurações para resetar' })
      return
    }

    try {
      setSaving(true)

      // Atualiza com valores padrão e remove a logo
      const dataToSend: ConfiguracaoUpdate = {
        logo_base64: null, // Remove a logo
        arquivo_politica_privacidade: null,
        arquivo_termos_uso: null,
        ...DEFAULT_VALUES,
      }

      const updated = await configuracoesService.update(
        getTenantSchema(),
        configuracao.id_config_global,
        dataToSend
      )

      // Atualiza o estado local
      setConfiguracao(updated)
      setFormData(DEFAULT_VALUES)
      setLogoPreview(null)
      setLogoFile(null)
      setPoliticaFile(null)
      setPoliticaNome(null)
      setTermosFile(null)
      setTermosNome(null)

      setToast({
        open: true,
        message: 'Configurações restauradas para o padrão de fábrica',
      })
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        message: err.message || 'Erro ao restaurar configurações padrão',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      setToast({ open: true, message: 'Usuário não autenticado' })
      return
    }

    try {
      setSaving(true)
      const dataToSend: ConfiguracaoUpdate = {
        ...formData,
      }

      if (logoFile) {
        dataToSend.logo_base64 = logoFile
      }
      if (politicaFile) {
        dataToSend.arquivo_politica_privacidade = politicaFile
      }
      if (termosFile) {
        dataToSend.arquivo_termos_uso = termosFile
      }

      let updated: ConfiguracaoGlobal

      // Se não existe configuração, cria uma nova
      if (!configuracao?.id_config_global) {
        const createData: ConfiguracaoCreate = {
          logo_base64: dataToSend.logo_base64 ?? undefined,
          cor_fundo: dataToSend.cor_fundo || DEFAULT_VALUES.cor_fundo,
          cor_card: dataToSend.cor_card || DEFAULT_VALUES.cor_card,
          cor_texto_card: dataToSend.cor_texto_card || DEFAULT_VALUES.cor_texto_card,
          cor_valor_card: dataToSend.cor_valor_card || DEFAULT_VALUES.cor_valor_card,
          cor_botao: dataToSend.cor_botao || DEFAULT_VALUES.cor_botao,
          cor_texto_botao: dataToSend.cor_texto_botao || DEFAULT_VALUES.cor_texto_botao,
          fonte_titulos: dataToSend.fonte_titulos || DEFAULT_VALUES.fonte_titulos,
          fonte_textos: dataToSend.fonte_textos || DEFAULT_VALUES.fonte_textos,
          arquivo_politica_privacidade: dataToSend.arquivo_politica_privacidade ?? undefined,
          arquivo_termos_uso: dataToSend.arquivo_termos_uso ?? undefined,
          usu_cadastro: parseInt(user.id, 10),
        }
        updated = await configuracoesService.create(getTenantSchema(), createData)
        setToast({
          open: true,
          message: 'Configurações criadas com sucesso',
        })
      } else {
        // Se existe, atualiza
        updated = await configuracoesService.update(getTenantSchema(), configuracao.id_config_global, dataToSend)
        setToast({
          open: true,
          message: 'Configurações atualizadas com sucesso',
        })
      }

      setConfiguracao(updated)
      if (updated.logo_base64) {
        setLogoPreview(updated.logo_base64)
      }
      setLogoFile(null) // Limpar o arquivo após salvar
      setPoliticaFile(null)
      setTermosFile(null)
      if (updated.arquivo_politica_privacidade) setPoliticaNome('Politica_de_Privacidade.pdf')
      if (updated.arquivo_termos_uso) setTermosNome('Termos_de_Uso.pdf')
    } catch (err: any) {
      console.error(err)
      setToast({
        open: true,
        message: err.message || 'Erro ao salvar configurações',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !configuracao) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="configuracoes-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" fontWeight={600}>
          Área do Cliente
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personalize a aparência e identidade visual da sua loja
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Logo */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                avatar={<Upload />}
                title="Logo da Loja"
                subheader="Envie o logotipo da sua loja (PNG ou JPEG, máximo 2MB)"
              />
              <CardContent>
                {logoPreview && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <img src={logoPreview} alt="Logo preview" style={{ maxHeight: '128px', objectFit: 'contain' }} />
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={handleDeleteLogo}
                      disabled={saving}
                      fullWidth
                    >
                      Excluir Logo
                    </Button>
                  </Box>
                )}
                <label htmlFor="logo-upload">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<Upload />}
                    fullWidth
                    sx={{
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                      },
                    }}
                  >
                    Clique para selecionar uma imagem
                  </Button>
                </label>
              </CardContent>
            </Card>
          </Grid>

          {/* Cores */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                avatar={<Palette />}
                title="Paleta de Cores"
                subheader="Defina as cores principais da sua loja"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor do Fundo"
                      value={formData.cor_fundo}
                      onChange={(e) => setFormData({ ...formData, cor_fundo: e.target.value })}
                      placeholder="#f8fafc"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_fundo || '#f8fafc'}
                              onChange={(e) => setFormData({ ...formData, cor_fundo: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor dos Cards"
                      value={formData.cor_card}
                      onChange={(e) => setFormData({ ...formData, cor_card: e.target.value })}
                      placeholder="#ffffff"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_card || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, cor_card: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor dos Textos de Card"
                      value={formData.cor_texto_card}
                      onChange={(e) => setFormData({ ...formData, cor_texto_card: e.target.value })}
                      placeholder="#000000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_texto_card || '#000000'}
                              onChange={(e) => setFormData({ ...formData, cor_texto_card: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor dos Valores de Card"
                      value={formData.cor_valor_card}
                      onChange={(e) => setFormData({ ...formData, cor_valor_card: e.target.value })}
                      placeholder="#000000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_valor_card || '#000000'}
                              onChange={(e) => setFormData({ ...formData, cor_valor_card: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor dos Botões"
                      value={formData.cor_botao}
                      onChange={(e) => setFormData({ ...formData, cor_botao: e.target.value })}
                      placeholder="#3b82f6"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_botao || '#3b82f6'}
                              onChange={(e) => setFormData({ ...formData, cor_botao: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cor do Texto dos Botões"
                      value={formData.cor_texto_botao}
                      onChange={(e) => setFormData({ ...formData, cor_texto_botao: e.target.value })}
                      placeholder="#ffffff"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <input
                              type="color"
                              value={formData.cor_texto_botao || '#ffffff'}
                              onChange={(e) => setFormData({ ...formData, cor_texto_botao: e.target.value })}
                              style={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Fontes */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                avatar={<TextFields />}
                title="Tipografia"
                subheader="Escolha as fontes para títulos e textos"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Fonte dos Títulos"
                      value={formData.fonte_titulos}
                      onChange={(e) => setFormData({ ...formData, fonte_titulos: e.target.value })}
                    >
                      {/* Fontes Padrão */}
                      <MenuItem disabled>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Fontes Padrão
                        </Typography>
                      </MenuItem>
                      {FONTE_OPTIONS.filter((f) => f.category === 'Padrão').map((fonte) => (
                        <MenuItem key={fonte.value} value={fonte.value} style={{ fontFamily: fonte.value }}>
                          {fonte.label}
                        </MenuItem>
                      ))}

                      {/* Google Fonts */}
                      <MenuItem disabled>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Google Fonts
                        </Typography>
                      </MenuItem>
                      {FONTE_OPTIONS.filter((f) => f.category === 'Google Fonts').map((fonte) => (
                        <MenuItem key={fonte.value} value={fonte.value} style={{ fontFamily: fonte.value }}>
                          {fonte.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    {formData.fonte_titulos && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" style={{ fontFamily: formData.fonte_titulos }}>
                          Exemplo de título com esta fonte
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Fonte dos Textos"
                      value={formData.fonte_textos}
                      onChange={(e) => setFormData({ ...formData, fonte_textos: e.target.value })}
                    >
                      {/* Fontes Padrão */}
                      <MenuItem disabled>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Fontes Padrão
                        </Typography>
                      </MenuItem>
                      {FONTE_OPTIONS.filter((f) => f.category === 'Padrão').map((fonte) => (
                        <MenuItem key={fonte.value} value={fonte.value} style={{ fontFamily: fonte.value }}>
                          {fonte.label}
                        </MenuItem>
                      ))}

                      {/* Google Fonts */}
                      <MenuItem disabled>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          Google Fonts
                        </Typography>
                      </MenuItem>
                      {FONTE_OPTIONS.filter((f) => f.category === 'Google Fonts').map((fonte) => (
                        <MenuItem key={fonte.value} value={fonte.value} style={{ fontFamily: fonte.value }}>
                          {fonte.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    {formData.fonte_textos && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" style={{ fontFamily: formData.fonte_textos }}>
                          Exemplo de texto com esta fonte
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Documentos */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                avatar={<Description />}
                title="Documentos Legais"
                subheader="Envie os arquivos PDF para Termos de Uso e Política de Privacidade"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Política de Privacidade (PDF)</Typography>
                    {politicaNome && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Description color="action" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>{politicaNome}</Typography>
                        <Button size="small" color="error" onClick={() => handleDeleteFile('politica')} disabled={saving}>
                          Remover
                        </Button>
                      </Box>
                    )}
                    <label htmlFor="politica-upload">
                      <input
                        id="politica-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handlePdfChange(e, 'politica')}
                        style={{ display: 'none' }}
                      />
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<Upload />}
                        fullWidth
                      >
                        Selecionar PDF
                      </Button>
                    </label>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Termos de Uso (PDF)</Typography>
                    {termosNome && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Description color="action" />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>{termosNome}</Typography>
                        <Button size="small" color="error" onClick={() => handleDeleteFile('termos')} disabled={saving}>
                          Remover
                        </Button>
                      </Box>
                    )}
                    <label htmlFor="termos-upload">
                      <input
                        id="termos-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handlePdfChange(e, 'termos')}
                        style={{ display: 'none' }}
                      />
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<Upload />}
                        fullWidth
                      >
                        Selecionar PDF
                      </Button>
                    </label>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Botão de Salvar */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={async () => {
                  try {
                    await downloadQRCodeClienteRegistroPNG(0)
                    setToast({
                      open: true,
                      message: 'QR Code baixado com sucesso!',
                    })
                  } catch (err: any) {
                    console.error('Erro ao gerar QR Code:', err)
                    setToast({
                      open: true,
                      message: err?.message || 'Erro ao gerar QR Code',
                    })
                  }
                }}
                startIcon={<QrCode2 />}
                size="large"
              >
                Baixar QR Code
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={saving || !configuracao?.id_config_global}
                onClick={handleResetToDefault}
                startIcon={<RestartAlt />}
                size="large"
              >
                Voltar ao Padrão
              </Button>
              <Button type="submit" variant="contained" disabled={saving} size="large">
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
      />
    </Box>
  )
}

export default ConfiguracoesPage

