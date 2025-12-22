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
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
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
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // Verificar autenticação inicial apenas uma vez
  useEffect(() => {
    if (!authLoading) {
      setInitialCheckDone(true)
      if (isAuthenticated) {
        // Redirecionar para o dashboard após login
        navigate('/dashboard', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, navigate])

  // Mostrar loading durante verificação inicial
  if (!initialCheckDone) {
    return (
      <Box className="login-page">
        <Box className="login-video-container">
          <Box className="login-video-overlay" />
        </Box>
        <Box className="login-content-wrapper">
          <CircularProgress sx={{ color: 'white' }} />
        </Box>
      </Box>
    )
  }

  // Se já estiver autenticado, mostrar loading enquanto redireciona
  if (isAuthenticated) {
    return (
      <Box className="login-page">
        <Box className="login-video-container">
          <Box className="login-video-overlay" />
        </Box>
        <Box className="login-content-wrapper">
          <CircularProgress sx={{ color: 'white' }} />
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="login-page">
      {/* Background gradiente */}
      <Box className="login-video-container">
        <Box className="login-video-overlay" />
      </Box>

      {/* Paper centralizado com logo e formulário */}
      <Box className="login-content-wrapper">
        <Paper
          elevation={24}
          className="login-panel"
          sx={{
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          }}
        >
          <Stack spacing={4} alignItems="center">
            {/* Logo */}
            <Box className="login-logo-wrapper">
              <Typography variant="h4" fontWeight={700} sx={{ color: 'white' }}>
                Concordia ERP
              </Typography>
            </Box>

            {/* Formulário */}
            <Box component="form" onSubmit={handleSubmit} className="login-form" sx={{ width: '100%' }}>
              <TextField
                placeholder="Digite seu login ou e-mail"
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    opacity: 1,
                  },
                }}
              />

              <TextField
                placeholder="Digite sua senha"
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    opacity: 1,
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="mostrar senha"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack spacing={1.5}>
                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  type="submit"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
                <Link
                  component="button"
                  type="button"
                  className="forgot-password"
                  underline="none"
                  onClick={() => navigate('/forgot-password', { replace: false })}
                >
                  Esqueci minha senha
                </Link>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}

export default LoginPage

