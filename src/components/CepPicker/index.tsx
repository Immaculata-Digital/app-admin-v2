import { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Close, LocationOn } from '@mui/icons-material'
import { maskCEP, unmaskCEP } from '../../utils/masks'
import './style.css'

type CepPickerProps = {
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

const CepPicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  placeholder = '00000-000',
  disabled = false,
  error = false,
  helperText,
  required = false,
}: CepPickerProps) => {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const cleanValue = unmaskCEP(value || '')
  const maskedValue = maskCEP(cleanValue)
  
  useEffect(() => {
    const newCleanValue = unmaskCEP(value || '')
    const newMaskedValue = maskCEP(newCleanValue)
    if (newMaskedValue !== maskedValue && inputRef.current) {
      inputRef.current.value = newMaskedValue
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const inputValue = event.target.value
    const cleanInput = unmaskCEP(inputValue)
    
    // Limitar a 8 dígitos
    if (cleanInput.length > 8) return
    
    const masked = maskCEP(cleanInput)
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
  }

  const shouldShowClearButton = !disabled && cleanValue && cleanValue.length > 0

  return (
    <Box className="cep-picker-container">
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
        error={error}
        helperText={helperText}
        required={required}
        inputProps={{
          maxLength: 9, // CEP com máscara tem 9 caracteres
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box className="cep-picker__start-icon">
                <LocationOn fontSize="small" />
              </Box>
            </InputAdornment>
          ),
          endAdornment: shouldShowClearButton ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="limpar CEP"
                onClick={handleClear}
                edge="end"
                size="small"
                disabled={disabled}
                className="cep-picker__clear-btn"
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        className={`cep-picker ${focused ? 'cep-picker--focused' : ''} ${
          error ? 'cep-picker--error' : ''
        }`}
      />
    </Box>
  )
}

export default CepPicker

