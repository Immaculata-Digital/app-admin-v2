import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { useSearch } from '../../context/SearchContext'
import { createPortal } from 'react-dom'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  useMediaQuery,
} from '@mui/material'
import { Add, DeleteOutline, MoreVert, ViewModule, TableChart, Edit } from '@mui/icons-material'
import type { SelectChangeEvent } from '@mui/material/Select'
import './style.css'

export type TableCardColumn<T extends TableCardRow> = {
  key: keyof T
  label: string
  dataType?: 'text' | 'number' | 'date' | 'status'
  render?: (value: any, row: T) => ReactNode
}

export type TableCardFieldRenderProps<T extends TableCardRow> = {
  value: any
  onChange: (value: any) => void
  field: TableCardFormField<T>
  formValues: Partial<T>
  setFieldValue: (key: keyof T, value: any) => void
  disabled: boolean
  isEditMode?: boolean
  error?: boolean
  helperText?: string
}

export type TableCardFormField<T extends TableCardRow> = TableCardColumn<T> & {
  inputType?:
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'select'
  | 'multiselect'
  options?: Array<{ label: string; value: any }>
  defaultValue?: any
  required?: boolean
  helperText?: string
  placeholder?: string
  disabled?: boolean
  renderInput?: (props: TableCardFieldRenderProps<T>) => ReactNode
}

export type TableCardRow = {
  id: string | number
  [key: string]: any
}

export type TableCardRowAction<T extends TableCardRow> = {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  disabled?: boolean | ((row: T) => boolean)
}

export type TableCardBulkAction<T extends TableCardRow> = {
  label: string
  icon: ReactNode
  onClick: (selectedIds: T['id'][]) => void
  disabled?: boolean | ((selectedIds: T['id'][]) => boolean)
}

type TableCardProps<T extends TableCardRow> = {
  title?: string
  columns: TableCardColumn<T>[]
  rows: T[]
  onAdd?: (data: Partial<T>) => void
  onEdit?: (id: T['id'], data: Partial<T>) => void
  onDelete?: (id: T['id']) => void
  onBulkDelete?: (ids: T['id'][]) => void
  formFields?: TableCardFormField<T>[]
  rowActions?: TableCardRowAction<T>[] | ((row: T) => TableCardRowAction<T>[])
  bulkActions?: TableCardBulkAction<T>[]
  disableDelete?: boolean
  canDeleteRow?: (row: T) => boolean
  disableEdit?: boolean
  disableView?: boolean
  onRowClick?: (row: T) => void
  onValidationError?: (message: string) => void
}

type DialogState<T extends TableCardRow> =
  | { mode: 'add'; open: true; row?: undefined }
  | { mode: 'edit'; open: true; row: T }
  | { mode: null; open: false; row?: undefined }

function TableCard<T extends TableCardRow>({
  title,
  columns,
  rows,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
  formFields,
  rowActions,
  bulkActions,
  disableDelete = false,
  canDeleteRow,
  disableEdit = false,
  disableView = false,
  onRowClick,
  onValidationError,
}: TableCardProps<T>) {
  const { query, selectedFilter } = useSearch()
  // const theme = useTheme()
  const isDesktop = useMediaQuery('(min-width:900px)')
  const [selectedIds, setSelectedIds] = useState<Array<T['id']>>([])
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window === 'undefined') return 'card'
    
    // Check local storage first (reset version)
    const stored = window.localStorage.getItem('concordia-table-view-mode-v2') as 'card' | 'table' | null
    if (stored) return stored

    // If no storage, strictly check window width for default
    return window.innerWidth >= 900 ? 'table' : 'card'
  })

  // Enforce view mode based on screen size changes
  useEffect(() => {
    if (!isDesktop) {
      setViewMode('card')
    } else {
      // Restore preference when returning to desktop
      const stored = window.localStorage.getItem('concordia-table-view-mode-v2') as 'card' | 'table' | null
      setViewMode(stored || 'table')
    }
  }, [isDesktop])

  const handleSetViewMode = (mode: 'card' | 'table') => {
    setViewMode(mode)
    window.localStorage.setItem('concordia-table-view-mode-v2', mode)
  }
  const [dialog, setDialog] = useState<DialogState<T>>({
    mode: null,
    open: false,
  })
  const [formValues, setFormValues] = useState<Partial<T>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuRow, setMenuRow] = useState<T | null>(null)

  // Define qual coluna será exibida como título e as demais como preview
  const [primaryColumn, ...secondaryColumns] = columns
  const formSchema = formFields ?? columns

  const filteredRows = useMemo(() => {
    if (!query) return rows
    const lower = query.toLowerCase()
    return rows.filter((row) => {
      if (selectedFilter) {
        const value = row[selectedFilter.field as keyof T]
        if (value === undefined || value === null) return false
        return String(value).toLowerCase().includes(lower)
      }
      return columns.some((column) => {
        const value = row[column.key]
        if (value === undefined || value === null) return false
        return String(value).toLowerCase().includes(lower)
      })
    })
  }, [rows, columns, query, selectedFilter])

  const allSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.includes(row.id))

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((row) => row.id))
    }
  }

  const handleToggleSelectRow = (id: T['id']) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const buildFormValues = (row?: T) => {
    if (!formFields) {
      if (row) return row
      return {} as Partial<T>
    }

    // Sempre incluir o ID se estiver editando
    const baseValues: Partial<T> = row?.id ? { id: row.id } as Partial<T> : {}

    const formValues = formSchema.reduce((acc, field) => {
      // Type assertion to access properties that might not exist on TableCardColumn
      const formField = field as TableCardFormField<T>
      const isMultiSelect = formField.inputType === 'multiselect'

      if (row) {
        const existingValue = row[field.key]
        // Se o campo for de senha (type password), não preencher na edição
        const isPasswordField = formField.inputType === 'password' || 
          (formField.renderInput && String(field.key).toLowerCase().includes('senha'))
        
        if (isMultiSelect) {
          acc[field.key] = (Array.isArray(existingValue)
            ? existingValue
            : existingValue !== undefined && existingValue !== null
              ? [existingValue]
              : []) as any
        } else {
          // Se for campo de senha na edição, usar defaultValue vazio ou string vazia
          if (isPasswordField) {
            acc[field.key] = formField.defaultValue ?? ''
          } else {
            acc[field.key] =
              existingValue !== undefined && existingValue !== null
                ? existingValue
                : formField.defaultValue ?? ''
          }
        }
      } else {
        acc[field.key] = (isMultiSelect
          ? Array.isArray(formField.defaultValue)
            ? formField.defaultValue
            : []
          : formField.defaultValue ?? '') as any
      }
      return acc
    }, baseValues as Partial<T>)

    return formValues
  }

  const openDialog = (mode: 'add' | 'edit', row?: T) => {
    setFieldErrors({})
    if (mode === 'add') {
      setDialog({ mode: 'add', open: true })
      setFormValues(buildFormValues())
      return
    }

    if (row) {
      setDialog({ mode: 'edit', open: true, row })
      setFormValues(buildFormValues(row))
    }
  }

  const closeDialog = () => {
    setDialog({ mode: null, open: false })
    setFormValues({})
    setFieldErrors({})
  }

  const handleSubmit = async () => {
    try {
      setFieldErrors({})
      if (dialog.mode === 'add') {
        await onAdd?.(formValues)
      }
      if (dialog.mode === 'edit' && dialog.row) {
        await onEdit?.(dialog.row.id, formValues)
      }
      closeDialog()
    } catch (error: any) {
      // Se for erro 422 (validação), não fechar a modal e mostrar erros
      // Verificar status diretamente no erro ou na propriedade status
      const errorStatus = error?.status || (error?.response?.status) || (error?.statusCode)
      if (errorStatus === 422) {
        const validationErrors: Record<string, string[]> = {}
        
        // Adicionar erros do backend se existirem
        if (error?.details) {
          const details = error.details as { fieldErrors?: Record<string, string[]> }
          if (details?.fieldErrors) {
            Object.assign(validationErrors, details.fieldErrors)
          }
        }
        
        // Verificar campos obrigatórios vazios (exceto senha)
        if (formFields) {
          formFields.forEach((field) => {
            const fieldKey = String(field.key)
            const isPasswordField = fieldKey.toLowerCase().includes('senha') || 
              fieldKey.toLowerCase().includes('password') ||
              field.inputType === 'password'
            
            // Se o campo é obrigatório e não é senha
            if (field.required && !isPasswordField) {
              const value = formValues[field.key]
              const isEmpty = value === '' || value === null || value === undefined || 
                (Array.isArray(value) && value.length === 0)
              
              // Se estiver vazio e não tiver erro já definido, adicionar erro
              if (isEmpty && !validationErrors[fieldKey]) {
                validationErrors[fieldKey] = [`O campo ${field.label} é obrigatório`]
              }
            }
          })
        }
        
        setFieldErrors(validationErrors)
        
        // Mostrar mensagem de erro
        if (onValidationError) {
          onValidationError('Campos inválidos. Verifique os campos obrigatórios.')
        }
        
        // Não fechar a modal
        return
      }
      // Para outros erros, re-lançar para que o componente pai possa tratar
      throw error
    }
  }

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    row: T,
  ) => {
    setAnchorEl(event.currentTarget)
    setMenuRow(row)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
    setMenuRow(null)
  }

  const handleDeleteRow = () => {
    if (menuRow && !disableDelete) {
      onDelete?.(menuRow.id)
      handleCloseMenu()
    }
  }

  const handleBulkDelete = () => {
    onBulkDelete?.(selectedIds)
    setSelectedIds([])
  }

  const handleFieldChange = (key: keyof T, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const renderFormField = (field: TableCardFormField<T> | TableCardColumn<T>) => {
    const value = formValues[field.key] ?? ''
    const inputType =
      'inputType' in field && field.inputType ? field.inputType : field.dataType ?? 'text'
    const fieldKey = String(field.key)
    const fieldErrorMessages = fieldErrors[fieldKey] || []
    const hasBackendError = fieldErrorMessages.length > 0
    
    // Verificar se o campo está vazio
    const isEmpty = value === '' || value === null || value === undefined || 
      (Array.isArray(value) && value.length === 0)
    const isPasswordField = inputType === 'password' || 
      (fieldKey.toLowerCase().includes('senha') || fieldKey.toLowerCase().includes('password'))
    
    // Verificar se é obrigatório
    const isRequired = 'required' in field && field.required === true
    
    // Mostrar erro se:
    // 1. Tem erro do backend E (é senha não vazia OU não é senha e está vazio)
    // 2. OU é obrigatório, não é senha, está vazio E há erros de validação (indicando que houve tentativa de submit)
    const hasValidationErrors = Object.keys(fieldErrors).length > 0
    const shouldShowError = hasBackendError && (isPasswordField ? !isEmpty : isEmpty) ||
      (isRequired && !isPasswordField && isEmpty && hasValidationErrors)

    if ('renderInput' in field && field.renderInput) {
      return (
        <Box key={fieldKey}>
          {field.renderInput({
            value,
            onChange: (newValue) => {
              handleFieldChange(field.key, newValue)
              // Limpar erro do campo quando o usuário começar a digitar
              if (fieldErrors[fieldKey]) {
                setFieldErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[fieldKey]
                  return newErrors
                })
              }
            },
            field: field as TableCardFormField<T>,
            formValues,
            setFieldValue: (key, newValue) => handleFieldChange(key, newValue),
            disabled: ('disabled' in field ? field.disabled : false) || (dialog.mode === 'edit' && disableEdit),
            isEditMode: dialog.mode === 'edit',
            error: shouldShowError,
            helperText: shouldShowError ? (fieldErrorMessages[0] || `${field.label} é obrigatório`) : ('helperText' in field ? field.helperText : undefined),
          })}
        </Box>
      )
    }

    if (inputType === 'select') {
      const options =
        'options' in field && field.options
          ? field.options
          : []
      const isPasswordFieldSelect = fieldKey.toLowerCase().includes('senha') || fieldKey.toLowerCase().includes('password')
      const isRequiredSelect = 'required' in field && field.required === true
      const hasValidationErrorsSelect = Object.keys(fieldErrors).length > 0
      const shouldShowErrorSelect = hasBackendError && (isPasswordFieldSelect ? !isEmpty : isEmpty) ||
        (isRequiredSelect && !isPasswordFieldSelect && isEmpty && hasValidationErrorsSelect)

      return (
        <TextField
          key={fieldKey}
          select
          label={field.label}
          value={value}
          onChange={(event) => {
            handleFieldChange(field.key, event.target.value)
            if (fieldErrors[fieldKey]) {
              setFieldErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[fieldKey]
                return newErrors
              })
            }
          }}
          fullWidth
          error={shouldShowErrorSelect}
          helperText={shouldShowErrorSelect ? (fieldErrorMessages[0] || `${field.label} é obrigatório`) : ('helperText' in field ? field.helperText : undefined)}
          required={'required' in field ? field.required : undefined}
          placeholder={'placeholder' in field ? field.placeholder : undefined}
          disabled={('disabled' in field ? field.disabled : undefined) || (dialog.mode === 'edit' && disableEdit)}
        >
          {options.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    if (inputType === 'multiselect') {
      const options =
        'options' in field && field.options
          ? field.options
          : []
      const multiValue = Array.isArray(value) ? value : []
      const isEmptyMulti = (multiValue as any[]).length === 0
      const isPasswordFieldMulti = fieldKey.toLowerCase().includes('senha') || fieldKey.toLowerCase().includes('password')
      const isRequiredMulti = 'required' in field && field.required === true
      const hasValidationErrorsMulti = Object.keys(fieldErrors).length > 0
      const shouldShowErrorMulti = hasBackendError && (isPasswordFieldMulti ? !isEmptyMulti : isEmptyMulti) ||
        (isRequiredMulti && !isPasswordFieldMulti && isEmptyMulti && hasValidationErrorsMulti)

      const handleMultiSelectChange = (event: SelectChangeEvent<string[]>) => {
        const selected = event.target.value
        handleFieldChange(
          field.key,
          typeof selected === 'string' ? selected.split(',') : selected,
        )
        if (fieldErrors[fieldKey]) {
          setFieldErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[fieldKey]
            return newErrors
          })
        }
      }

      return (
        <TextField
          key={fieldKey}
          select
          label={field.label}
          value={multiValue}
          onChange={(e) => handleMultiSelectChange(e as any)}
          fullWidth
          SelectProps={{
            multiple: true,
            renderValue: (selected) => (selected as (string | number)[]).map(String).join(', '),
          }}
          error={shouldShowErrorMulti}
          helperText={shouldShowErrorMulti ? (fieldErrorMessages[0] || `${field.label} é obrigatório`) : ('helperText' in field ? field.helperText : undefined)}
          required={'required' in field ? field.required : undefined}
          placeholder={'placeholder' in field ? field.placeholder : undefined}
          disabled={('disabled' in field ? field.disabled : undefined) || (dialog.mode === 'edit' && disableEdit)}
        >
          {options.map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>
              <Checkbox checked={(multiValue as any[]).includes(option.value)} />
              <span>{option.label}</span>
            </MenuItem>
          ))}
        </TextField>
      )
    }

    const textFieldType =
      inputType === 'password'
        ? 'password'
        : inputType === 'email'
          ? 'email'
          : inputType === 'number'
            ? 'number'
            : inputType === 'date'
              ? 'date'
              : 'text'
    const isPasswordFieldText = inputType === 'password' || 
      fieldKey.toLowerCase().includes('senha') || fieldKey.toLowerCase().includes('password')
    const isRequiredText = 'required' in field && field.required === true
    const hasValidationErrorsText = Object.keys(fieldErrors).length > 0
    const shouldShowErrorText = hasBackendError && (isPasswordFieldText ? !isEmpty : isEmpty) ||
      (isRequiredText && !isPasswordFieldText && isEmpty && hasValidationErrorsText)

    return (
      <TextField
        key={fieldKey}
        label={field.label}
        type={textFieldType}
        value={value}
        onChange={(event) => {
          handleFieldChange(field.key, event.target.value)
          if (fieldErrors[fieldKey]) {
            setFieldErrors((prev) => {
              const newErrors = { ...prev }
              delete newErrors[fieldKey]
              return newErrors
            })
          }
        }}
        fullWidth
        error={shouldShowErrorText}
        helperText={shouldShowErrorText ? (fieldErrorMessages[0] || `${field.label} é obrigatório`) : ('helperText' in field ? field.helperText : undefined)}
        required={'required' in field ? field.required : undefined}
        placeholder={'placeholder' in field ? field.placeholder : undefined}
        disabled={('disabled' in field ? field.disabled : undefined) || (dialog.mode === 'edit' && disableEdit)}
        InputLabelProps={inputType === 'date' ? { shrink: true } : undefined}
      />
    )
  }

  const renderCell = (row: T, column: TableCardColumn<T>) => {
    const value = row[column.key]
    if (column.render) return column.render(value, row)
    if (column.dataType === 'date' && value) {
      return new Date(value).toLocaleDateString()
    }
    if (column.dataType === 'status') {
      return (
        <span className={`status-pill status-pill--${String(value).toLowerCase()}`}>
          {value}
        </span>
      )
    }
    return value ?? '--'
  }

  return (
    <Box className="table-card">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          className="table-card__toolbar"
        >
          {title && (
            <Typography variant="h5" component="h1" fontWeight={600}>
              {title}
            </Typography>
          )}
          <Stack direction="row" spacing={0.5} className="table-card__view-toggle">
            <IconButton
              size="small"
              onClick={() => handleSetViewMode('card')}
              className={viewMode === 'card' ? 'table-card__view-toggle--active' : ''}
              aria-label="Visualização em cards"
              sx={{ color: '#ffffff' }} // Force white
            >
              <ViewModule fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleSetViewMode('table')}
              className={viewMode === 'table' ? 'table-card__view-toggle--active' : ''}
              aria-label="Visualização em tabela"
              sx={{ color: '#ffffff' }} // Force white
            >
              <TableChart fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Visualização em Cards ou Tabela */}
        {viewMode === 'card' ? (
          <Box className="table-card__list-container">
            <Stack spacing={0.5} className="table-card__list">
              {filteredRows.map((row) => {
                const isSelected = selectedIds.includes(row.id)

                return (
                  <Box
                    key={row.id}
                    className={`table-card__gmail-card ${isSelected ? 'table-card__gmail-card--selected' : ''}`}
                    onClick={() => {
                      if (!isSelected) {
                         if (onRowClick) {
                           onRowClick(row)
                         } else if (!disableView) {
                           openDialog('edit', row)
                         }
                      }
                    }}
                  >
                    <Box className="table-card__gmail-card-content">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(row.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="table-card__checkbox"
                      />

                      <Box className="table-card__gmail-card-main" flex={1}>
                        <Box className="table-card__gmail-card-header">
                          {primaryColumn && (
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              className="table-card__gmail-title"
                              component="div"
                            >
                              {renderCell(row, primaryColumn)}
                            </Typography>
                          )}

                          <IconButton
                            className="table-card__gmail-actions"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleOpenMenu(event, row)
                            }}
                            size="small"
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>

                        {secondaryColumns.length > 0 && (
                          <Box className="table-card__gmail-card-preview">
                            {secondaryColumns.map((column) => (
                              <Typography
                                key={String(column.key)}
                                variant="body2"
                                color="text.secondary"
                                className="table-card__gmail-preview-item"
                                component="div"
                              >
                                <span className="table-card__gmail-preview-label">
                                  {column.label}:
                                </span>{' '}
                                {renderCell(row, column)}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )
              })}

              {filteredRows.length === 0 && (
                <Box className="table-card__empty-state">
                  <Typography align="center" color="text.secondary" variant="body1" className="table-card__empty-text">
                    Nenhum registro encontrado.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        ) : (
          <Box className="table-card__table-container">
            <Box className="table-card__table-wrapper">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        onChange={handleToggleSelectAll}
                        indeterminate={
                          selectedIds.length > 0 && !allSelected && filteredRows.length > 0
                        }
                      />
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={String(column.key)}>{column.label}</TableCell>
                    ))}
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      className={`table-card__row ${selectedIds.includes(row.id) ? 'table-card__row--selected' : ''}`}
                      onClick={() => {
                        if (!selectedIds.includes(row.id)) {
                          if (onRowClick) {
                             onRowClick(row)
                          } else if (!disableView) {
                             openDialog('edit', row)
                          }
                        }
                      }}
                    >
                      <TableCell
                        padding="checkbox"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleToggleSelectRow(row.id)}
                        />
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={String(column.key)}>
                          {renderCell(row, column)}
                        </TableCell>
                      ))}
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation()
                            handleOpenMenu(event, row)
                          }}
                          size="small"
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2}>
                        <Typography align="center" color="text.secondary" className="table-card__empty-text">
                          Nenhum registro encontrado.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Stack>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        {menuRow && (() => {
          const actions = typeof rowActions === 'function' ? rowActions(menuRow) : rowActions || []
          return actions.map((action) => {
            const isDisabled = typeof action.disabled === 'function' 
              ? action.disabled(menuRow)
              : action.disabled || false
            
            return (
              <MenuItem
                key={action.label}
                onClick={() => {
                  if (!isDisabled) {
                    action.onClick(menuRow)
                  }
                  handleCloseMenu()
                }}
                disabled={isDisabled}
              >
                {action.icon && (
                  <span style={{ display: 'inline-flex', marginRight: 8 }}>{action.icon}</span>
                )}
                {action.label}
              </MenuItem>
            )
          })
        })()}
        {onEdit && (
          <MenuItem
            onClick={() => {
              if (menuRow) {
                openDialog('edit', menuRow)
                handleCloseMenu()
              }
            }}
            disabled={disableEdit}
          >
            <Edit fontSize="small" style={{ marginRight: 8 }} />
            Editar
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem 
            onClick={handleDeleteRow} 
            disabled={disableDelete || (menuRow && canDeleteRow ? !canDeleteRow(menuRow) : false)}
          >
            <DeleteOutline fontSize="small" style={{ marginRight: 8 }} />
            Excluir
          </MenuItem>
        )}
      </Menu>

      <Dialog 
        open={dialog.open} 
        onClose={closeDialog} 
        fullWidth 
        maxWidth="sm"
        className="table-card__form-dialog"
        PaperProps={{
          className: 'table-card__dialog-paper'
        }}
      >
        <DialogTitle className="table-card__dialog-title">
          {dialog.mode === 'add' ? 'Adicionar registro' : 'Editar registro'}
        </DialogTitle>
        <DialogContent dividers className="table-card__dialog-content">
          <Stack spacing={2} className="table-card__form-fields">
            {formSchema.map((field) => renderFormField(field))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit" className="button-cancel">
            {dialog.mode === 'edit' && disableEdit ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={dialog.mode === 'edit' && disableEdit}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {onAdd && createPortal(
        <Fab
          color="primary"
          aria-label="adicionar"
          onClick={() => openDialog('add')}
          className="table-card__fab"
        >
          <Add />
        </Fab>,
        document.body,
      )}

      {selectedIds.length > 0 &&
        createPortal(
          <Box className="table-card__top-actions">
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Typography variant="body1" fontWeight={600}>
                {selectedIds.length} registro(s) selecionado(s)
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  alignSelf: { xs: 'flex-end', sm: 'center' },
                  width: { xs: '100%', sm: 'auto' },
                  justifyContent: { xs: 'flex-end', sm: 'flex-start' }
                }}
              >
                {bulkActions?.map((action) => (
                  <Tooltip key={action.label} title={action.label}>
                    <span>
                      <IconButton
                        color="primary"
                        onClick={() => action.onClick(selectedIds)}
                        disabled={
                          typeof action.disabled === 'function'
                            ? action.disabled(selectedIds)
                            : action.disabled
                        }
                      >
                        {action.icon}
                      </IconButton>
                    </span>
                  </Tooltip>
                ))}
                <Tooltip title="Excluir selecionados">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleBulkDelete}
                      disabled={!onBulkDelete}
                      aria-label="Excluir selecionados"
                    >
                      <DeleteOutline />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Selecionar todos">
                  <Checkbox
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    indeterminate={
                      selectedIds.length > 0 && !allSelected && filteredRows.length > 0
                    }
                    aria-label="Selecionar todos"
                  />
                </Tooltip>
              </Stack>
            </Stack>
          </Box>,
          document.body,
        )}
    </Box>
  )
}

export default TableCard

