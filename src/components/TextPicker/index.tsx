import { useState, useEffect, useRef } from 'react'
import {
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material'
import { Close, Search } from '@mui/icons-material'
import './style.css'

type TextPickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  maxRows?: number
  maxLength?: number
  showClearButton?: boolean
  startIcon?: React.ReactNode
  type?: 'text' | 'search' | 'textarea'
  autoFocus?: boolean
}

const TextPicker = ({
  label,
  value,
  onChange,
  fullWidth = false,
  placeholder,
  disabled = false,
  error = false,
  helperText,
  required = false,
  multiline = false,
  rows,
  maxRows,
  maxLength,
  showClearButton = true,
  startIcon,
  type = 'text',
  autoFocus = false,
}: TextPickerProps) => {
  const [focused, setFocused] = useState(false)
  const [characterCount, setCharacterCount] = useState(value?.length || 0)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Atualizar contador de caracteres
  useEffect(() => {
    setCharacterCount(value?.length || 0)
  }, [value])

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value

    // Validar comprimento máximo
    if (maxLength && newValue.length > maxLength) {
      return
    }

    onChange(newValue)
    setCharacterCount(newValue.length)
  }

  const handleClear = () => {
    onChange('')
    setCharacterCount(0)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(true)
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFocused(false)
  }

  // Determinar ícone inicial baseado no tipo
  const defaultStartIcon = type === 'search' ? <Search /> : null
  const displayStartIcon = startIcon || defaultStartIcon

  // Determinar se deve mostrar botão de limpar
  const shouldShowClearButton = showClearButton && !disabled && value && value.length > 0

  // Helper text com contador de caracteres
  const displayHelperText =
    helperText ||
    (maxLength && value
      ? `${characterCount}/${maxLength} caracteres`
      : '')

  const inputType = multiline ? undefined : (type === 'search' ? 'text' : type)

  return (
    <Box className="text-picker-container">
      <TextField
        inputRef={inputRef}
        label={label}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={displayHelperText}
        required={required}
        multiline={multiline}
        rows={rows}
        maxRows={maxRows}
        inputProps={{
          maxLength: maxLength,
          type: inputType,
        }}
        InputProps={{
          startAdornment: displayStartIcon ? (
            <InputAdornment position="start">
              <Box className="text-picker__start-icon">{displayStartIcon}</Box>
            </InputAdornment>
          ) : undefined,
          endAdornment: shouldShowClearButton ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="limpar texto"
                onClick={handleClear}
                edge="end"
                size="small"
                disabled={disabled}
                className="text-picker__clear-btn"
              >
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        className={`text-picker ${focused ? 'text-picker--focused' : ''} ${
          error ? 'text-picker--error' : ''
        }`}
      />
    </Box>
  )
}

export default TextPicker

