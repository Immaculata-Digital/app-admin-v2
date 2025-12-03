import { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Close, Numbers } from '@mui/icons-material'
import { maskCurrency, currencyToNumber, unmaskCurrency } from '../../utils/masks'
import './style.css'

type NumberPickerProps = {
  label?: string
  value: string | number
  onChange: (value: string | number) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  type?: 'number' | 'currency' | 'integer'
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
}

const NumberPicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  placeholder = '',
  disabled = false,
  error = false,
  helperText,
  required = false,
  type = 'number',
  min,
  max,
  step = 1,
  prefix,
  suffix,
}: NumberPickerProps) => {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const getDisplayValue = () => {
    if (type === 'currency') {
      const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      // Para currency, convertemos o número para centavos e formatamos
      const cents = Math.round(numericValue * 100)
      return maskCurrency(String(cents))
    }
    return String(value || '')
  }
  
  const displayValue = getDisplayValue()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const inputValue = event.target.value
    
    if (type === 'currency') {
      // Remove tudo exceto números e converte para número
      const cleanValue = unmaskCurrency(inputValue)
      const numericValue = cleanValue ? parseFloat(cleanValue) / 100 : 0
      
      // Validar min/max
      if (min !== undefined && numericValue < min) return
      if (max !== undefined && numericValue > max) return
      
      onChange(numericValue)
    } else if (type === 'integer') {
      // Apenas números inteiros
      const cleanValue = inputValue.replace(/\D/g, '')
      if (cleanValue === '') {
        onChange('')
        return
      }
      const numericValue = parseInt(cleanValue, 10)
      if (isNaN(numericValue)) return
      
      // Validar min/max
      if (min !== undefined && numericValue < min) return
      if (max !== undefined && numericValue > max) return
      
      onChange(numericValue)
    } else {
      // Número decimal
      const cleanValue = inputValue.replace(/[^\d.,-]/g, '')
      if (cleanValue === '' || cleanValue === '-') {
        onChange('')
        return
      }
      
      // Permitir apenas um ponto decimal
      const parts = cleanValue.split(/[,.]/)
      if (parts.length > 2) return
      
      const numericValue = parseFloat(cleanValue.replace(',', '.'))
      if (isNaN(numericValue) && cleanValue !== '' && cleanValue !== '-') return
      
      // Validar min/max
      if (!isNaN(numericValue)) {
        if (min !== undefined && numericValue < min) return
        if (max !== undefined && numericValue > max) return
      }
      
      onChange(numericValue || '')
    }
  }

  const handleClear = () => {
    onChange(type === 'currency' ? 0 : '')
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

  const shouldShowClearButton = !disabled && (
    (type === 'currency' && value !== 0 && value !== '') ||
    (type !== 'currency' && value !== '' && value !== null && value !== undefined)
  )

  const inputType = type === 'currency' ? 'text' : type === 'integer' ? 'text' : 'text'
  
  return (
    <Box className="number-picker-container">
      <TextField
        inputRef={inputRef}
        label={label}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={helperText}
        required={required}
        type={inputType}
        inputProps={{
          min,
          max,
          step,
        }}
        InputProps={{
          startAdornment: prefix ? (
            <InputAdornment position="start">
              <Box className="number-picker__prefix">{prefix}</Box>
            </InputAdornment>
          ) : (
            <InputAdornment position="start">
              <Box className="number-picker__start-icon">
                <Numbers fontSize="small" />
              </Box>
            </InputAdornment>
          ),
          endAdornment: (
            <>
              {suffix && (
                <InputAdornment position="end">
                  <Box className="number-picker__suffix">{suffix}</Box>
                </InputAdornment>
              )}
              {shouldShowClearButton && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="limpar número"
                    onClick={handleClear}
                    edge="end"
                    size="small"
                    disabled={disabled}
                    className="number-picker__clear-btn"
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )}
            </>
          ),
        }}
        className={`number-picker ${focused ? 'number-picker--focused' : ''} ${
          error ? 'number-picker--error' : ''
        }`}
      />
    </Box>
  )
}

export default NumberPicker

