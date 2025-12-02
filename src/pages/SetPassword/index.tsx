import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import PasswordPicker from '../../components/PasswordPicker'
import { userService } from '../../services/users'
import './style.css'

const SetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error'; open: boolean }>({
    message: '',
    severity: 'success',
    open: false,
  })

  const token = searchParams.get('token')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) {
      setToast({ open: true, severity: 'error', message: 'Token inválido ou ausente' })
      return
    }

    if (!password || password.length < 8) {
      setToast({ open: true, severity: 'error', message: 'Senha deve ter ao menos 8 caracteres' })
      return
    }

    if (password !== confirmPassword) {
      setToast({ open: true, severity: 'error', message: 'As senhas não conferem' })
      return
    }

    try {
      setSubmitting(true)
      await userService.resetPassword({ token, password, confirmPassword })
      setToast({ open: true, severity: 'success', message: 'Senha definida com sucesso!' })
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      setToast({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível definir a senha',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box className="set-password-page">
      <Paper elevation={3} className="set-password-card">
        <Typography variant="h5" fontWeight={600}>
          Definir nova senha
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Crie uma senha forte para iniciar o uso do Concordia ERP.
        </Typography>

        {!token ? (
          <Alert severity="error">Link inválido ou expirado.</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <PasswordPicker
                label="Nova senha"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 8 caracteres"
                fullWidth
              />
              <PasswordPicker
                label="Confirmar senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repita a nova senha"
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} /> : null}
              >
                {submitting ? 'Salvando...' : 'Definir senha'}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={toast.severity} onClose={() => setToast((prev) => ({ ...prev, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default SetPasswordPage

