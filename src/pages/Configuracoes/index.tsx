import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Snackbar,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import { Upload, Palette, TextFields } from '@mui/icons-material'
import { configuracoesService, type ConfiguracaoGlobal, type ConfiguracaoUpdate, type ConfiguracaoCreate } from '../../services/configuracoes'
import { getTenantSchema } from '../../utils/schema'
import { useAuth } from '../../context/AuthContext'
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
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<string | null>(null)

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
      })
      if (configuracao.logo_base64) {
        setLogoPreview(configuracao.logo_base64)
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

      let updated: ConfiguracaoGlobal

      // Se não existe configuração, cria uma nova
      if (!configuracao?.id_config_global) {
        const createData: ConfiguracaoCreate = {
          logo_base64: dataToSend.logo_base64,
          cor_fundo: dataToSend.cor_fundo || '#f8fafc',
          cor_card: dataToSend.cor_card || '#ffffff',
          cor_texto_card: dataToSend.cor_texto_card || '#000000',
          cor_valor_card: dataToSend.cor_valor_card || '#000000',
          cor_botao: dataToSend.cor_botao || '#3b82f6',
          cor_texto_botao: dataToSend.cor_texto_botao || '#ffffff',
          fonte_titulos: dataToSend.fonte_titulos || 'Arial',
          fonte_textos: dataToSend.fonte_textos || 'Arial',
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
                      justifyContent: 'center',
                      alignItems: 'center',
                      p: 2,
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <img src={logoPreview} alt="Logo preview" style={{ maxHeight: '128px', objectFit: 'contain' }} />
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

          {/* Botão de Salvar */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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

