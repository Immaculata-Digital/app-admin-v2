import { useState, useEffect, useMemo } from 'react'
import {
  TextField,
  Box,
  IconButton,
  Typography,
  InputAdornment,
  LinearProgress,
} from '@mui/material'
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material'
import './style.css'

type PasswordStrength = 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'

type PasswordPickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  showStrengthIndicator?: boolean
  minLength?: number
  required?: boolean
}

// Calcular força da senha
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password || password.length === 0) return 'very-weak'

  let strength = 0

  // Comprimento
  if (password.length >= 8) strength += 1
  if (password.length >= 12) strength += 1

  // Letras minúsculas
  if (/[a-z]/.test(password)) strength += 1

  // Letras maiúsculas
  if (/[A-Z]/.test(password)) strength += 1

  // Números
  if (/[0-9]/.test(password)) strength += 1

  // Caracteres especiais
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1

  if (strength <= 2) return 'very-weak'
  if (strength === 3) return 'weak'
  if (strength === 4) return 'fair'
  if (strength === 5) return 'good'
  return 'strong'
}

// Obter mensagem de força da senha
const getStrengthMessage = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'very-weak':
      return 'Muito fraca'
    case 'weak':
      return 'Fraca'
    case 'fair':
      return 'Razoável'
    case 'good':
      return 'Boa'
    case 'strong':
      return 'Forte'
    default:
      return ''
  }
}

// Obter porcentagem de força
const getStrengthPercentage = (strength: PasswordStrength): number => {
  switch (strength) {
    case 'very-weak':
      return 20
    case 'weak':
      return 40
    case 'fair':
      return 60
    case 'good':
      return 80
    case 'strong':
      return 100
    default:
      return 0
  }
}

// Obter cor da força
const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'very-weak':
      return '#f44336' // Vermelho
    case 'weak':
      return '#ff9800' // Laranja
    case 'fair':
      return '#ffc107' // Amarelo
    case 'good':
      return '#4caf50' // Verde claro
    case 'strong':
      return '#2e7d32' // Verde escuro
    default:
      return 'transparent'
  }
}

const PasswordPicker = ({
  label = 'Senha',
  value,
  onChange,
  fullWidth = false,
  placeholder = 'Digite sua senha',
  disabled = false,
  error = false,
  helperText,
  showStrengthIndicator = false,
  minLength = 8,
  required = false,
}: PasswordPickerProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const passwordStrength = useMemo(() => calculatePasswordStrength(value), [value])
  const strengthPercentage = useMemo(() => getStrengthPercentage(passwordStrength), [passwordStrength])

  // Validar senha
  const isValid = useMemo(() => {
    if (!value) return !required
    return value.length >= minLength
  }, [value, minLength, required])

  const displayError = error || (value && !isValid)
  const displayHelperText =
    helperText ||
    (showStrengthIndicator && value && focused
      ? `Força: ${getStrengthMessage(passwordStrength)}`
      : value && !isValid
        ? `A senha deve ter pelo menos ${minLength} caracteres`
        : '')

  return (
    <Box className="password-picker-container">
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        error={displayError}
        helperText={displayHelperText}
        type={showPassword ? 'text' : 'password'}
        required={required}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock className="password-picker__lock-icon" fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'ocultar senha' : 'mostrar senha'}
                onClick={() => setShowPassword((prev) => !prev)}
                edge="end"
                disabled={disabled}
                className="password-picker__toggle-btn"
              >
                {showPassword ? (
                  <VisibilityOff className="password-picker__visibility-icon" fontSize="small" />
                ) : (
                  <Visibility className="password-picker__visibility-icon" fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
        className="password-picker"
      />
      {showStrengthIndicator && value && focused && (
        <Box className="password-picker__strength-indicator">
          <LinearProgress
            variant="determinate"
            value={strengthPercentage}
            className={`password-picker__strength-bar password-picker__strength-bar--${passwordStrength}`}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--color-hover)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getStrengthColor(passwordStrength),
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}
    </Box>
  )
}

export default PasswordPicker

