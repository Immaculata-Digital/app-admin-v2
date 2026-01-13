import { useState } from 'react'
import { TextField, IconButton } from '@mui/material'
import { Email, CheckCircle } from '@mui/icons-material'
import './style.css'

type MailPickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
}

const isValidEmail = (email: string): boolean => {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const MailPicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  placeholder = 'digite@email.com',
  disabled = false,
  error = false,
  helperText,
  required = false,
}: MailPickerProps) => {
  const [touched, setTouched] = useState(false)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    onChange(event.target.value)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const emailError = error || (touched && value ? !isValidEmail(value) : false)

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleInputChange}
      onBlur={handleBlur}
      fullWidth={fullWidth}
      placeholder={placeholder}
      disabled={disabled}
      error={emailError}
      helperText={helperText || (touched && value && !isValidEmail(value) ? 'Email inválido' : '')}
      type="email"
      required={required}
      InputProps={{
        endAdornment: (
          <IconButton
            edge="end"
            size="small"
            disabled={disabled}
            className="mail-picker__icon-btn"
            sx={{ mr: -1 }}
          >
            {value && isValidEmail(value) ? (
              <CheckCircle className="mail-picker__valid-icon" fontSize="small" />
            ) : (
              <Email className="mail-picker__email-icon" fontSize="small" />
            )}
          </IconButton>
        ),
      }}
      className="mail-picker"
    />
  )
}

export default MailPicker

