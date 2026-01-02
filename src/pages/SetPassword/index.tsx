import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import PasswordPicker from '../../components/PasswordPicker'
import { userService } from '../../services/users'
import { AuthTemplate } from '../../components/AuthTemplate'
import './style.css'

const SetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  
  const token = searchParams.get('token')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus(null)
    
    if (!token) {
      setStatus({ severity: 'error', message: 'Token inválido ou ausente' })
      return
    }

    if (!password || password.length < 8) {
      setStatus({ severity: 'error', message: 'Senha deve ter ao menos 8 caracteres' })
      return
    }

    if (password !== confirmPassword) {
      setStatus({ severity: 'error', message: 'As senhas não conferem' })
      return
    }

    try {
      setSubmitting(true)
      await userService.resetPassword({ token, password, confirmPassword })
      setStatus({ severity: 'success', message: 'Senha definida com sucesso! Redirecionando...' })
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      setStatus({
        severity: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível definir a senha',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthTemplate
       visualTitle="Nova Senha"
       visualDescription="Defina uma senha segura para proteger sua conta e acessar todas as funcionalidades da plataforma."
       formTitle="Definir nova senha"
       formSubtitle="Crie uma senha forte para iniciar o uso do Concordia ERP."
    >
      <Box className="login-form-container" sx={{ width: '100%', maxWidth: 'none' }}> 
        {!token ? (
          <Alert severity="error" className="glass-alert" sx={{ mb: 3 }}>Link inválido ou expirado.</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} className="login-form">
            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" className="input-label-text">
                  Nova senha
                </Typography>
                <Box className="custom-input">
                  <PasswordPicker
                    value={password}
                    onChange={setPassword}
                    placeholder="Mínimo 8 caracteres"
                    fullWidth
                    showStrengthIndicator
                  />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" className="input-label-text">
                  Confirmar senha
                </Typography>
                <Box className="custom-input">
                  <PasswordPicker
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repita a nova senha"
                    fullWidth
                  />
                </Box>
              </Box>

             {status && (
                <Alert severity={status.severity} className="glass-alert">
                  {status.message}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                className="login-button"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                fullWidth
                size="large"
              >
                {submitting ? 'Salvando...' : 'Definir senha'}
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </AuthTemplate>
  )
}

export default SetPasswordPage
