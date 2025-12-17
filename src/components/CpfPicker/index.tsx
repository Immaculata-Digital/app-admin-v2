import { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Close, Person } from '@mui/icons-material'
import { maskCPF, unmaskCPF, validateCPF } from '../../utils/masks'
import './style.css'

type CpfPickerProps = {
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

const CpfPicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  placeholder = '000.000.000-00',
  disabled = false,
  error = false,
  helperText,
  required = false,
}: CpfPickerProps) => {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const cleanValue = unmaskCPF(value || '')
  const maskedValue = maskCPF(cleanValue)
  const isValid = cleanValue ? validateCPF(cleanValue) : true
  const showError = error || (touched && cleanValue && !isValid)
  
  useEffect(() => {
    // Se o valor mudar externamente, atualizar
    const newCleanValue = unmaskCPF(value || '')
    const newMaskedValue = maskCPF(newCleanValue)
    if (newMaskedValue !== maskedValue && inputRef.current) {
      inputRef.current.value = newMaskedValue
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const inputValue = event.target.value
    const cleanInput = unmaskCPF(inputValue)
    
    // Limitar a 11 dígitos
    if (cleanInput.length > 11) return
    
    onChange(cleanInput) // Envia valor sem máscara
  }

  const handleClear = () => {
    onChange('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleFocus = () => {
    setFocused(true)
  }

  const handleBlur = () => {
    setFocused(false)
    setTouched(true)
  }

  const shouldShowClearButton = !disabled && cleanValue && cleanValue.length > 0

  return (
    <Box className="cpf-picker-container">
      <TextField
        inputRef={inputRef}
        label={label}
        value={maskedValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        error={!!showError}
        helperText={showError && cleanValue && !isValid 
          ? 'CPF inválido' 
          : helperText || ''}
        required={required}
        inputProps={{
          maxLength: 14, // CPF com máscara tem 14 caracteres
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box className="cpf-picker__start-icon">
                <Person fontSize="small" />
              </Box>
            </InputAdornment>
          ),
          endAdornment: shouldShowClearButton ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="limpar CPF"
                onClick={handleClear}
                edge="end"
                size="small"
                disabled={disabled}
                className="cpf-picker__clear-btn"
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        className={`cpf-picker ${focused ? 'cpf-picker--focused' : ''} ${
          showError ? 'cpf-picker--error' : ''
        }`}
      />
    </Box>
  )
}

export default CpfPicker

