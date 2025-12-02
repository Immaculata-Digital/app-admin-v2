import { TextField } from '@mui/material'

type KeyPickerProps = {
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

const KeyPicker = ({
  label,
  value,
  onChange,
  fullWidth = false,
  placeholder = 'Ex: EMAIL-RESET-PASSWORD',
  disabled = false,
  error = false,
  helperText,
  required = false,
}: KeyPickerProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value

    // Remove caracteres inválidos (mantém apenas letras, números, espaços e hífens)
    newValue = newValue.replace(/[^A-Za-z0-9\s-]/g, '')

    // Converte para maiúsculo
    newValue = newValue.toUpperCase()

    // Transforma espaços em hífen
    newValue = newValue.replace(/\s+/g, '-')

    // Remove hífens consecutivos
    newValue = newValue.replace(/-+/g, '-')

    // Remove hífen do início e fim
    newValue = newValue.replace(/^-+|-+$/g, '')

    onChange(newValue)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Previne a digitação de espaços (já transformamos em hífen no onChange)
    if (event.key === ' ') {
      event.preventDefault()
      // Simula a digitação de um hífen
      const input = event.currentTarget
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const currentValue = value
      const newValue = currentValue.slice(0, start) + '-' + currentValue.slice(end)
      onChange(newValue.toUpperCase().replace(/-+/g, '-').replace(/^-+|-+$/g, ''))
      // Reposiciona o cursor
      setTimeout(() => {
        input.setSelectionRange(start + 1, start + 1)
      }, 0)
    }
  }

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      fullWidth={fullWidth}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      helperText={helperText || 'Apenas letras, números e hífens. Espaços são convertidos em hífen.'}
      required={required}
      inputProps={{
        style: {
          textTransform: 'uppercase',
          fontFamily: 'monospace',
        },
      }}
    />
  )
}

export default KeyPicker

