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

export type MultiSelectOption = {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

type MultiSelectPickerProps = {
  label?: string
  value: (string | number)[]
  onChange: (value: (string | number)[]) => void
  options: MultiSelectOption[]
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  searchable?: boolean
  selectAll?: boolean
  maxDisplayChips?: number
  emptyText?: string
  searchPlaceholder?: string
  showSelectAll?: boolean
  groupBy?: boolean
  chipVariant?: 'filled' | 'outlined'
  chipDisplay?: 'inline' | 'summary' | 'block'
}

const MultiSelectPicker = ({
  label,
  value = [],
  onChange,
  options,
  fullWidth = false,
  placeholder = 'Selecione as opções',
  disabled = false,
  error = false,
  helperText,
  required = false,
  searchable = true,

  maxDisplayChips = 3,
  emptyText = 'Nenhuma opção disponível',
  searchPlaceholder = 'Buscar...',
  showSelectAll = true,
  groupBy = false,
  chipVariant = 'filled',
  chipDisplay = 'inline',
}: MultiSelectPickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsListRef = useRef<HTMLDivElement>(null)

  const open = Boolean(anchorEl)

  // Agrupar opções se necessário
  const groupedOptions = useMemo(() => {
    if (!groupBy) return null

    const groups: Record<string, MultiSelectOption[]> = {}
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
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        String(option.value).toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Opções agrupadas filtradas
  const filteredGroupedOptions = useMemo(() => {
    if (!groupedOptions || !searchQuery) return groupedOptions

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, MultiSelectOption[]> = {}

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

  // Verificar se todas as opções filtradas estão selecionadas
  const allFilteredSelected = useMemo(() => {
    const optionsToCheck = groupedOptions
      ? Object.values(filteredGroupedOptions || {}).flat()
      : filteredOptions
    return (
      optionsToCheck.length > 0 &&
      optionsToCheck.every((option) => value.includes(option.value))
    )
  }, [filteredOptions, filteredGroupedOptions, groupedOptions, value])

  // Verificar se alguma opção filtrada está selecionada
  const someFilteredSelected = useMemo(() => {
    const optionsToCheck = groupedOptions
      ? Object.values(filteredGroupedOptions || {}).flat()
      : filteredOptions
    return (
      optionsToCheck.some((option) => value.includes(option.value)) &&
      !allFilteredSelected
    )
  }, [filteredOptions, filteredGroupedOptions, groupedOptions, value, allFilteredSelected])

  // Verificar se uma opção está selecionada
  const isSelected = (optionValue: string | number): boolean => {
    return value.includes(optionValue)
  }

  // Obter labels das opções selecionadas
  const getSelectedLabels = () => {
    return value
      .map((val) => {
        const option = options.find((opt) => opt.value === val)
        return option ? { value: val, label: option.label } : null
      })
      .filter(Boolean) as { value: string | number; label: string }[]
  }

  const selectedLabels = getSelectedLabels()
  const showAllChips = chipDisplay === 'inline' || chipDisplay === 'block'
  const displayChips = showAllChips ? selectedLabels : selectedLabels.slice(0, maxDisplayChips)
  const remainingCount = showAllChips ? 0 : Math.max(0, selectedLabels.length - maxDisplayChips)

  // Valor de exibição para o TextField (similar ao SelectPicker)
  const displayValue = value.length > 0 && !showAllChips
    ? `${value.length} selecionado(s)`
    : ''

  // Lidar com abertura do popover
  const handleOpen = (event: React.MouseEvent<HTMLDivElement | HTMLInputElement>) => {
    if (disabled) return
    setAnchorEl(event.currentTarget as HTMLDivElement)
    setSearchQuery('')
    setFocusedIndex(-1)
  }

  // Lidar com fechamento do popover
  const handleClose = () => {
    setAnchorEl(null)
    setSearchQuery('')
    setFocusedIndex(-1)
  }

  // Lidar com seleção/deseleção de opção
  const handleToggle = (optionValue: string | number) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  // Lidar com selecionar/deselecionar todos
  const handleSelectAll = () => {
    const optionsToSelect = groupedOptions
      ? Object.values(filteredGroupedOptions || {}).flat()
      : filteredOptions

    const allValues = optionsToSelect.map((opt) => opt.value)
    const allSelected = allValues.every((val) => value.includes(val))

    if (allSelected) {
      // Deselecionar todos os filtrados
      onChange(value.filter((val) => !allValues.includes(val)))
    } else {
      // Selecionar todos os filtrados (sem duplicatas)
      const newValues = [...new Set([...value, ...allValues])]
      onChange(newValues)
    }
  }

  // Remover chip
  const handleRemoveChip = (chipValue: string | number, event: React.MouseEvent) => {
    event.stopPropagation()
    onChange(value.filter((v) => v !== chipValue))
  }

  // Limpar todas as seleções
  const handleClearAll = (event: React.MouseEvent) => {
    event.stopPropagation()
    onChange([])
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
        prev < optionsToNavigate.length - 1 ? prev + 1 : prev === -1 ? 0 : prev
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : prev === -1 ? optionsToNavigate.length - 1 : prev
      )
    } else if (event.key === 'Enter' && focusedIndex >= 0) {
      event.preventDefault()
      handleToggle(optionsToNavigate[focusedIndex].value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
    } else if (searchable && event.key.length === 1) {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
  }

  // Scroll para o item focado
  useEffect(() => {
    if (focusedIndex >= 0 && optionsListRef.current) {
      const focusedElement = optionsListRef.current.children[
        focusedIndex + (showSelectAll ? 1 : 0)
      ] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex, showSelectAll])

  // Focar no campo de busca quando abrir
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open, searchable])

  const shouldShowClearButton =
    !disabled && value.length > 0

  const optionsToRender = groupedOptions
    ? Object.values(filteredGroupedOptions || {}).flat()
    : filteredOptions

  return (
    <>
      <TextField
        label={label}
        value={displayValue}
        placeholder={value.length > 0 && showAllChips ? '' : placeholder}
        fullWidth={fullWidth}
        disabled={disabled}
        error={error}
        helperText={helperText}
        required={required}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        InputProps={{
          readOnly: true,
          startAdornment: value.length > 0 ? (
            <InputAdornment position="start">
              <Box
                className={`multi-select-picker__chips-container ${chipDisplay === 'inline' ? 'multi-select-picker__chips-container--inline' : ''
                  }`}
              >
                {displayChips.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    onDelete={(e) => handleRemoveChip(item.value, e)}
                    size="small"
                    variant={chipVariant}
                    className="multi-select-picker__chip"
                    disabled={disabled}
                  />
                ))}
                {remainingCount > 0 && (
                  <Chip
                    label={`+${remainingCount}`}
                    size="small"
                    variant={chipVariant}
                    className="multi-select-picker__chip multi-select-picker__chip--more"
                    disabled={disabled}
                  />
                )}
              </Box>
            </InputAdornment>
          ) : undefined,
          endAdornment: (
            <InputAdornment position="end">
              {shouldShowClearButton && (
                <IconButton
                  onClick={handleClearAll}
                  edge="end"
                  size="small"
                  disabled={disabled}
                  className="multi-select-picker__clear-btn"
                >
                  <Close fontSize="small" />
                </IconButton>
              )}
              <IconButton
                edge="end"
                size="small"
                disabled={disabled}
                className={`multi-select-picker__arrow ${open ? 'multi-select-picker__arrow--open' : ''}`}
              >
                <ExpandMore fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        className={`multi-select-picker ${value.length > 0 && showAllChips ? 'multi-select-picker--hidden-input' : ''
          }`}
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
        className="multi-select-picker-popover"
        disableRestoreFocus
      >
        <Paper className="multi-select-picker__paper">
          {/* Campo de busca */}
          {searchable && (
            <Box className="multi-select-picker__search-container">
              <TextField
                inputRef={searchInputRef}
                autoFocus
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
                className="multi-select-picker__search"
              />
            </Box>
          )}

          {/* Botão Selecionar Todos */}
          {showSelectAll && optionsToRender.length > 0 && (
            <MenuItem
              onClick={handleSelectAll}
              className="multi-select-picker__select-all"
            >
              <Checkbox
                checked={allFilteredSelected}
                indeterminate={someFilteredSelected}
                size="small"
              />
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600}>
                    Selecionar todos
                  </Typography>
                }
              />
            </MenuItem>
          )}

          {/* Lista de opções */}
          <Box className="multi-select-picker__options" ref={optionsListRef}>
            {groupedOptions && filteredGroupedOptions ? (
              Object.keys(filteredGroupedOptions).map((group) => (
                <Box key={group} className="multi-select-picker__group">
                  <Typography variant="caption" className="multi-select-picker__group-title">
                    {group}
                  </Typography>
                  {filteredGroupedOptions[group].map((option) => {
                    const globalIndex = optionsToRender.indexOf(option)
                    const selected = isSelected(option.value)
                    return (
                      <MenuItem
                        key={option.value}
                        onClick={() => handleToggle(option.value)}
                        selected={selected}
                        disabled={option.disabled}
                        className={`multi-select-picker__option ${focusedIndex === globalIndex
                          ? 'multi-select-picker__option--focused'
                          : ''
                          } ${selected ? 'multi-select-picker__option--selected' : ''}`}
                      >
                        <Checkbox
                          checked={selected}
                          size="small"
                          className="multi-select-picker__checkbox"
                        />
                        <ListItemText
                          primary={option.label}
                          className="multi-select-picker__option-text"
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
                    onClick={() => handleToggle(option.value)}
                    selected={selected}
                    disabled={option.disabled}
                    className={`multi-select-picker__option ${focusedIndex === index
                      ? 'multi-select-picker__option--focused'
                      : ''
                      } ${selected ? 'multi-select-picker__option--selected' : ''}`}
                  >
                    <Checkbox
                      checked={selected}
                      size="small"
                      className="multi-select-picker__checkbox"
                    />
                    <ListItemText
                      primary={option.label}
                      className="multi-select-picker__option-text"
                    />
                  </MenuItem>
                )
              })
            ) : (
              <Box className="multi-select-picker__empty">
                <Typography variant="body2" color="text.secondary">
                  {emptyText}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Contador de seleções */}
          {value.length > 0 && (
            <Box className="multi-select-picker__footer">
              <Typography variant="caption" className="multi-select-picker__counter">
                {value.length} {value.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </Typography>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  )
}

export default MultiSelectPicker

