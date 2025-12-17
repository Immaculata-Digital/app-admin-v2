import { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Close, Business } from '@mui/icons-material'
import { maskCNPJ, unmaskCNPJ, validateCNPJ } from '../../utils/masks'
import './style.css'

type CnpjPickerProps = {
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

const CnpjPicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  placeholder = '00.000.000/0000-00',
  disabled = false,
  error = false,
  helperText,
  required = false,
}: CnpjPickerProps) => {
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const cleanValue = unmaskCNPJ(value || '')
  const maskedValue = maskCNPJ(cleanValue)
  const isValid = cleanValue ? validateCNPJ(cleanValue) : true
  const showError = error || (touched && cleanValue && !isValid)
  
  useEffect(() => {
    const newCleanValue = unmaskCNPJ(value || '')
    const newMaskedValue = maskCNPJ(newCleanValue)
    if (newMaskedValue !== maskedValue && inputRef.current) {
      inputRef.current.value = newMaskedValue
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const inputValue = event.target.value
    const cleanInput = unmaskCNPJ(inputValue)
    
    // Limitar a 14 dígitos
    if (cleanInput.length > 14) return
    
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
    <Box className="cnpj-picker-container">
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
          ? 'CNPJ inválido' 
          : helperText || ''}
        required={required}
        inputProps={{
          maxLength: 18, // CNPJ com máscara tem 18 caracteres
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box className="cnpj-picker__start-icon">
                <Business fontSize="small" />
              </Box>
            </InputAdornment>
          ),
          endAdornment: shouldShowClearButton ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="limpar CNPJ"
                onClick={handleClear}
                edge="end"
                size="small"
                disabled={disabled}
                className="cnpj-picker__clear-btn"
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        className={`cnpj-picker ${focused ? 'cnpj-picker--focused' : ''} ${
          showError ? 'cnpj-picker--error' : ''
        }`}
      />
    </Box>
  )
}

export default CnpjPicker

