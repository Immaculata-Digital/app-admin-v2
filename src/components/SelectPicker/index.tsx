import { useState, useEffect, useMemo, useRef } from 'react'
import {
  TextField,
  Popover,
  Box,
  IconButton,
  Typography,
  MenuItem,
  InputAdornment,
  ListItemText,
  Checkbox,
  Chip,
  Paper,
} from '@mui/material'
import {
  ExpandMore,
  Search,
  Close,
} from '@mui/icons-material'
import './style.css'

export type SelectOption = {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

type SelectPickerProps = {
  label?: string
  value: string | number | (string | number)[] | null
  onChange: (value: string | number | (string | number)[] | null) => void
  options: SelectOption[]
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  emptyText?: string
  searchPlaceholder?: string
  showCheckbox?: boolean
  groupBy?: boolean
}

const SelectPicker = ({
  label,
  value,
  onChange,
  options,
  fullWidth = false,
  placeholder = 'Selecione uma opção',
  disabled = false,
  error = false,
  helperText,
  required = false,
  multiple = false,
  searchable = true,
  clearable = true,
  emptyText = 'Nenhuma opção disponível',
  searchPlaceholder = 'Buscar...',
  showCheckbox = false,
  groupBy = false,
}: SelectPickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsListRef = useRef<HTMLDivElement>(null)

  const open = Boolean(anchorEl)

  // Agrupar opções se necessário
  const groupedOptions = useMemo(() => {
    if (!groupBy) return null

    const groups: Record<string, SelectOption[]> = {}
    options.forEach((option) => {
      const group = option.group || 'Outros'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(option)
    })

    return groups
  }, [options, groupBy])

  // Filtrar opções baseado na busca
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options

    const query = searchQuery.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query) ||
      String(option.value).toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Opções agrupadas filtradas
  const filteredGroupedOptions = useMemo(() => {
    if (!groupedOptions || !searchQuery) return groupedOptions

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, SelectOption[]> = {}

    Object.keys(groupedOptions).forEach((group) => {
      const groupOptions = groupedOptions[group].filter(
        (option) =>
          option.label.toLowerCase().includes(query) ||
          String(option.value).toLowerCase().includes(query)
      )
      if (groupOptions.length > 0) {
        filtered[group] = groupOptions
      }
    })

    return filtered
  }, [groupedOptions, searchQuery])

  // Obter labels das opções selecionadas
  const getSelectedLabels = () => {
    if (multiple && Array.isArray(value)) {
      return value
        .map((val) => {
          const option = options.find((opt) => opt.value === val)
          return option?.label || String(val)
        })
        .filter(Boolean)
    } else if (value !== null && value !== undefined) {
      const option = options.find((opt) => opt.value === value)
      return option?.label || String(value)
    }
    return ''
  }

  const selectedLabels = getSelectedLabels()
  const displayValue = multiple
    ? Array.isArray(selectedLabels) && selectedLabels.length > 0
      ? `${selectedLabels.length} selecionado(s)`
      : ''
    : selectedLabels

  // Verificar se uma opção está selecionada
  const isSelected = (optionValue: string | number): boolean => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue)
    }
    return value === optionValue
  }

  // Lidar com abertura do popover
  const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    setAnchorEl(event.currentTarget)
    setSearchQuery('')
    setFocusedIndex(-1)
  }

  // Lidar com fechamento do popover
  const handleClose = () => {
    setAnchorEl(null)
    setSearchQuery('')
    setFocusedIndex(-1)
  }

  // Lidar com seleção de opção
  const handleSelect = (optionValue: string | number) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : []
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter((v) => v !== optionValue)
        : [...currentValue, optionValue]
      onChange(newValue.length > 0 ? newValue : null)
    } else {
      onChange(optionValue)
      handleClose()
    }
  }

  // Lidar com limpeza
  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation()
    onChange(null)
    handleClose()
  }

  // Navegação por teclado
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        if (event.currentTarget instanceof HTMLElement) {
          handleOpen(event as any)
        }
      }
      return
    }

    const optionsToNavigate = groupedOptions
      ? Object.values(filteredGroupedOptions || {}).flat()
      : filteredOptions

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIndex((prev) =>
        prev < optionsToNavigate.length - 1 ? prev + 1 : 0
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : optionsToNavigate.length - 1
      )
    } else if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault()
      handleSelect(optionsToNavigate[focusedIndex].value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
    } else if (searchable && event.key.length === 1) {
      // Focar no campo de busca
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
  }

  // Scroll para o item focado
  useEffect(() => {
    if (focusedIndex >= 0 && optionsListRef.current) {
      const focusedElement = optionsListRef.current.children[focusedIndex] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex])

  // Focar no campo de busca quando abrir
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open, searchable])

  const shouldShowClearButton = clearable && !disabled && value !== null && value !== undefined && 
    ((Array.isArray(value) && value.length > 0) || (!Array.isArray(value)))

  const optionsToRender = groupedOptions
    ? Object.values(filteredGroupedOptions || {}).flat()
    : filteredOptions

  return (
    <>
      <TextField
        label={label}
        value={displayValue}
        placeholder={placeholder}
        fullWidth={fullWidth}
        disabled={disabled}
        error={error}
        helperText={helperText}
        required={required}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              {shouldShowClearButton ? (
                <IconButton
                  onClick={handleClear}
                  edge="end"
                  size="small"
                  disabled={disabled}
                  className="select-picker__clear-btn"
                >
                  <Close fontSize="small" />
                </IconButton>
              ) : null}
              <IconButton
                edge="end"
                size="small"
                disabled={disabled}
                className={`select-picker__arrow ${open ? 'select-picker__arrow--open' : ''}`}
              >
                <ExpandMore fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        className="select-picker"
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        className="select-picker-popover"
        disableRestoreFocus
      >
        <Paper className="select-picker__paper">
          {/* Campo de busca */}
          {searchable && (
            <Box className="select-picker__search-container">
              <TextField
                inputRef={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setFocusedIndex(-1)
                }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                className="select-picker__search"
              />
            </Box>
          )}

          {/* Lista de opções */}
          <Box className="select-picker__options" ref={optionsListRef}>
            {groupedOptions && filteredGroupedOptions ? (
              Object.keys(filteredGroupedOptions).map((group) => (
                <Box key={group} className="select-picker__group">
                  <Typography variant="caption" className="select-picker__group-title">
                    {group}
                  </Typography>
                  {filteredGroupedOptions[group].map((option) => {
                    const globalIndex = optionsToRender.indexOf(option)
                    const selected = isSelected(option.value)
                    return (
                      <MenuItem
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        selected={selected}
                        disabled={option.disabled}
                        className={`select-picker__option ${
                          focusedIndex === globalIndex ? 'select-picker__option--focused' : ''
                        } ${selected ? 'select-picker__option--selected' : ''}`}
                      >
                        {showCheckbox && (
                          <Checkbox
                            checked={selected}
                            size="small"
                            className="select-picker__checkbox"
                          />
                        )}
                        <ListItemText
                          primary={option.label}
                          className="select-picker__option-text"
                        />
                      </MenuItem>
                    )
                  })}
                </Box>
              ))
            ) : optionsToRender.length > 0 ? (
              optionsToRender.map((option, index) => {
                const selected = isSelected(option.value)
                return (
                  <MenuItem
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    selected={selected}
                    disabled={option.disabled}
                    className={`select-picker__option ${
                      focusedIndex === index ? 'select-picker__option--focused' : ''
                    } ${selected ? 'select-picker__option--selected' : ''}`}
                  >
                    {showCheckbox && (
                      <Checkbox
                        checked={selected}
                        size="small"
                        className="select-picker__checkbox"
                      />
                    )}
                    <ListItemText
                      primary={option.label}
                      className="select-picker__option-text"
                    />
                  </MenuItem>
                )
              })
            ) : (
              <Box className="select-picker__empty">
                <Typography variant="body2" color="text.secondary">
                  {emptyText}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Chips de seleção múltipla */}
          {multiple && Array.isArray(value) && value.length > 0 && (
            <Box className="select-picker__chips">
              {value.slice(0, 3).map((val) => {
                const option = options.find((opt) => opt.value === val)
                return (
                  <Chip
                    key={val}
                    label={option?.label || String(val)}
                    size="small"
                    onDelete={() => handleSelect(val)}
                    className="select-picker__chip"
                  />
                )
              })}
              {value.length > 3 && (
                <Chip
                  label={`+${value.length - 3}`}
                  size="small"
                  className="select-picker__chip select-picker__chip--more"
                />
              )}
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  )
}

export default SelectPicker

