import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Link,
  Stack,
  Paper,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './style.css'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState({ loginOrEmail: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // Verificar autenticação inicial apenas uma vez
  useEffect(() => {
    if (!authLoading && !initialCheckDone) {
      setInitialCheckDone(true)
      if (isAuthenticated) {
        // Redirecionar para o dashboard após login
        navigate('/dashboard', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, navigate, initialCheckDone])

  // Mostrar loading durante verificação inicial
  if (!initialCheckDone) {
    return (
      <Box className="login-page">
        <Box className="login-image-container" />
        <Box className="login-content-wrapper">
          <CircularProgress sx={{ color: '#007AFF' }} />
        </Box>
      </Box>
    )
  }

  // Se já estiver autenticado, mostrar loading enquanto redireciona
  if (isAuthenticated) {
    return (
      <Box className="login-page">
        <Box className="login-image-container" />
        <Box className="login-content-wrapper">
          <CircularProgress sx={{ color: '#007AFF' }} />
        </Box>
      </Box>
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(credentials)
      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100))
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      // Se for erro 401 (Unauthorized), mostrar mensagem genérica de credenciais inválidas
      if (err?.status === 401) {
        setError('Usuário ou senha inválidos')
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="login-page">
      {/* Container da imagem (lado esquerdo no desktop, topo no mobile) */}
      <Box className="login-image-container" />

      {/* Container do formulário (lado direito no desktop, embaixo no mobile) */}
      <Box className="login-content-wrapper">
        <Paper elevation={0} className="login-panel">
          <Stack spacing={4} sx={{ width: '100%' }}>
            {/* Título e subtítulo */}
            <Box sx={{ marginBottom: '8px' }}>
              <Typography 
                variant="h4" 
                className="login-title" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#1d1d1f',
                  fontSize: '32px',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.1',
                }}
              >
                Concordia ERP
              </Typography>
              <Typography 
                variant="body1" 
                className="login-subtitle" 
                sx={{ 
                  color: '#86868b', 
                  marginTop: '8px',
                  fontSize: '17px',
                  fontWeight: 400,
                  lineHeight: '1.47',
                }}
              >
                Sistema de Gestão de Franquias
              </Typography>
            </Box>

            {/* Formulário */}
            <Box component="form" onSubmit={handleSubmit} className="login-form">
              <TextField
                placeholder="Login ou e-mail"
                type="text"
                value={credentials.loginOrEmail}
                onChange={(event) =>
                  setCredentials((prev) => ({
                    ...prev,
                    loginOrEmail: event.target.value,
                  }))
                }
                fullWidth
                required
                disabled={loading}
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#8e8e93', fontSize: '20px' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      borderWidth: '1px',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007AFF',
                      borderWidth: '2px',
                    },
                    '& input': {
                      padding: '14px 16px',
                      fontSize: '16px',
                      color: '#1d1d1f',
                      '&::placeholder': {
                        color: '#8e8e93',
                        opacity: 1,
                      },
                    },
                  },
                }}
              />

              <TextField
                placeholder="Senha"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                fullWidth
                required
                disabled={loading}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#8e8e93', fontSize: '20px' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="mostrar senha"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        sx={{ 
                          color: '#8e8e93',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          },
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      borderWidth: '1px',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.12)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007AFF',
                      borderWidth: '2px',
                    },
                    '& input': {
                      padding: '14px 16px',
                      fontSize: '16px',
                      color: '#1d1d1f',
                      '&::placeholder': {
                        color: '#8e8e93',
                        opacity: 1,
                      },
                    },
                  },
                }}
              />

              <Stack spacing={2.5}>
                {error && (
                  <Alert 
                    severity="error" 
                    onClose={() => setError(null)}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: '#ff3b30',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 400,
                      '& .MuiAlert-icon': {
                        color: '#ffffff',
                      },
                      '& .MuiAlert-action': {
                        '& .MuiIconButton-root': {
                          color: '#ffffff',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        },
                      },
                    }}
                  >
                    {error}
                  </Alert>
                )}

                <Box className="login-options">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{
                          color: '#007AFF',
                          padding: '4px',
                          '&.Mui-checked': {
                            color: '#007AFF',
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: '20px',
                          },
                        }}
                      />
                    }
                    label="Lembrar-me"
                    sx={{ 
                      color: '#1d1d1f', 
                      fontSize: '15px',
                      fontWeight: 400,
                      margin: 0,
                      '& .MuiFormControlLabel-label': {
                        paddingLeft: '8px',
                      },
                    }}
                  />
                  <Link
                    component="button"
                    type="button"
                    className="forgot-password"
                    underline="none"
                    onClick={() => navigate('/forgot-password', { replace: false })}
                    sx={{ 
                      color: '#007AFF', 
                      fontSize: '15px', 
                      fontWeight: 400,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Esqueci minha senha?
                  </Link>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  type="submit"
                  disabled={loading}
                  sx={{
                    background: '#007AFF',
                    padding: '14px 24px',
                    fontSize: '17px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.2)',
                    letterSpacing: '-0.2px',
                    '&:hover': {
                      background: '#0051D5',
                      boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                    },
                    '&:active': {
                      background: '#0040A3',
                    },
                    '&.Mui-disabled': {
                      background: '#c7c7cc',
                      color: '#ffffff',
                    },
                  }}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" sx={{ color: '#ffffff' }} /> : null}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}

export default LoginPage

