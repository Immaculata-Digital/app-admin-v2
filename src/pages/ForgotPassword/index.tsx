import { useState } from 'react'
import {
  Box,
  Button,
  Link,
  Stack,
  Paper,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import MailPicker from '../../components/MailPicker'
import './style.css'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação de senha. Tente novamente.')
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
            {/* Conteúdo */}
            {success ? (
              <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
                <Alert severity="success" sx={{ width: '100%' }}>
                  Instruções para redefinição de senha foram enviadas para o e-mail informado.
                  Verifique sua caixa de entrada e siga as instruções.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/', { replace: true })}
                >
                  Voltar para o login
                </Button>
              </Stack>
            ) : (
              <>
                <Typography 
                  variant="h5" 
                  component="h1" 
                  sx={{ 
                    color: 'white', 
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  Esqueci minha senha
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    textAlign: 'center',
                    mb: 1,
                  }}
                >
                  Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
                </Typography>

                {/* Formulário */}
                <Box component="form" onSubmit={handleSubmit} className="login-form" sx={{ width: '100%' }}>
                  <Box
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.4)',
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(0, 0, 0, 0.4)',
                        opacity: 1,
                      },
                    }}
                  >
                    <MailPicker
                      value={email}
                      onChange={setEmail}
                      fullWidth
                      placeholder="Digite seu e-mail"
                      disabled={loading}
                      error={!!error}
                    />
                  </Box>

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
                      disabled={loading || !email}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      {loading ? 'Enviando...' : 'Enviar instruções'}
                    </Button>
                    <Link
                      component="button"
                      type="button"
                      className="forgot-password"
                      underline="none"
                      onClick={() => navigate('/', { replace: true })}
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
                    >
                      <ArrowBack fontSize="small" />
                      Voltar para o login
                    </Link>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}

export default ForgotPasswordPage

