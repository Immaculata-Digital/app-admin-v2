import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Link,
  Stack,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AuthTemplate } from '../../components/AuthTemplate'

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
        navigate('/dashboard', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(credentials)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // Assuming err is an Error object or ApiError
      console.error("Login error:", err);
      // Ensure we display a message, defaulting to the one requested
      setError('Credenciais inválidas. Tente novamente.') 
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading durante verificação inicial
  if (!initialCheckDone) {
    return (
     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#0d1117' }}>
        <CircularProgress sx={{ color: 'white' }} />
     </Box>
    )
  }

  return (
    <AuthTemplate
      visualTitle="Concordia ERP"
      visualDescription="Gerencie seu negócio com eficiência e segurança."
      visualFeatures={[
        'Painel de Controle Completo',
        'Relatórios em Tempo Real',
        'Gestão de Usuários e Permissões'
      ]}
      formTitle="Bem-vindo"
      formSubtitle="Insira suas credenciais para acessar sua conta."
    >
      <Box component="form" onSubmit={handleSubmit} className="login-form">
        <Stack spacing={3}>
          <Box>
            <Typography variant="caption" className="input-label-text">
              E-mail
            </Typography>
            <TextField
              placeholder="exemplo@gmail.com"
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
              className="custom-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ color: 'var(--input-label)', display: 'flex' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" className="input-label-text">
              Senha
            </Typography>
            <TextField
              placeholder="••••••••"
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
              className="custom-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ color: 'var(--input-label)', display: 'flex' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </Box>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="mostrar senha"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ color: 'var(--input-label)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Link
              component="button"
              type="button"
              className="forgot-password-link"
              underline="none"
              onClick={() => navigate('/forgot-password', { replace: false })}
            >
              Esqueci minha senha
            </Link>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} className="glass-alert">
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
            className="login-button"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Entrando...' : 'Entrar na conta'}
          </Button>
        </Stack>
      </Box>
    </AuthTemplate>
  )
}

export default LoginPage
