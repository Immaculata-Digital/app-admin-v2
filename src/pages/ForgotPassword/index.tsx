import { useState } from 'react'
import {
  Box,
  Button,
  Link,
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import MailPicker from '../../components/MailPicker'
import { AuthTemplate } from '../../components/AuthTemplate'
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
    <AuthTemplate
      visualTitle="Recuperação"
      visualDescription="Recupere o acesso à sua conta de forma rápida e segura."
      formTitle={success ? 'E-mail enviado!' : 'Esqueci minha senha'}
      formSubtitle={success ? '' : 'Digite seu e-mail para receber as instruções.'}
    >
      {success ? (
        <Stack spacing={3} alignItems="center" sx={{ width: '100%', textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </Box>
          <Alert severity="success" className="glass-alert" sx={{ width: '100%', textAlign: 'left' }}>
            Instruções para redefinição de senha foram enviadas para <strong>{email}</strong>.
          </Alert>
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate('/', { replace: true })}
            className="login-button"
          >
            Voltar para o login
          </Button>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit} className="login-form">
          <Box>
              <Typography variant="caption" className="input-label-text">
                E-mail
              </Typography>
              <Box
                className="custom-input"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--input-bg) !important',
                  }
                }}
              >
                <MailPicker
                  value={email}
                  onChange={setEmail}
                  fullWidth
                  placeholder="exemplo@gmail.com"
                  disabled={loading}
                  error={!!error}
                />
              </Box>
          </Box>

          <Stack spacing={2} sx={{ mt: 2 }}>
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
              disabled={loading || !email}
              className="login-button"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Link
                component="button"
                type="button"
                className="forgot-password-link"
                underline="none"
                onClick={() => navigate('/', { replace: true })}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <ArrowBack fontSize="small" />
                Voltar para o login
              </Link>
            </Box>
          </Stack>
        </Box>
      )}
    </AuthTemplate>
  )
}

export default ForgotPasswordPage
