import { useState, useEffect, useMemo } from 'react'
import {
  TextField,
  Popover,
  Box,
  IconButton,
  Typography,
  MenuItem,
  InputAdornment,
  ListItemText,
} from '@mui/material'
import { Phone, ExpandMore, Search } from '@mui/icons-material'
import './style.css'

type PhonePickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
}

type Country = {
  code: string
  name: string
  dialCode: string
  flag: string
}

// Lista de países com códigos DDI
const COUNTRIES: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'Índia', dialCode: '+91', flag: '🇮🇳' },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
]

const DEFAULT_COUNTRY = COUNTRIES[0] // Brasil por padrão

// Parsear número de telefone para extrair país e número
const parsePhoneNumber = (value: string): { country: Country; number: string } => {
  if (!value) {
    return { country: DEFAULT_COUNTRY, number: '' }
  }

  // Se começa com +, tentar encontrar o país
  if (value.startsWith('+')) {
    for (const country of COUNTRIES) {
      if (value.startsWith(country.dialCode)) {
        const number = value.substring(country.dialCode.length).trim()
        return { country, number }
      }
    }
  }

  // Se não encontrou, assumir país padrão e usar o valor completo
  return { country: DEFAULT_COUNTRY, number: value.replace(/^\+?\d*/, '') }
}

// Formatar número de telefone
const formatPhoneNumber = (number: string, country: Country): string => {
  if (!number) return ''
  
  // Remove caracteres não numéricos
  const digits = number.replace(/\D/g, '')
  
  // Formatação específica para Brasil
  if (country.code === 'BR') {
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }
  }

  // Para outros países, retorna os dígitos
  return digits
}

const PhonePicker = ({
  label,
  value,
  onChange,
  fullWidth = false,
  placeholder = 'Digite o número',
  disabled = false,
  error = false,
  helperText,
}: PhonePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { country, number } = useMemo(() => parsePhoneNumber(value || ''), [value])
  const [selectedCountry, setSelectedCountry] = useState<Country>(country)
  const [formattedNumber, setFormattedNumber] = useState(number)

  // Atualizar quando o valor externo mudar
  useEffect(() => {
    const parsed = parsePhoneNumber(value || '')
    setSelectedCountry(parsed.country)
    setFormattedNumber(parsed.number)
  }, [value])

  const open = Boolean(anchorEl)

  const handleCountryClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    setAnchorEl(event.currentTarget)
    setSearchQuery('')
  }

  const handleClose = () => {
    setAnchorEl(null)
    setSearchQuery('')
  }

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    // Manter o número atual e atualizar apenas o DDI
    const newValue = country.dialCode + (formattedNumber || '')
    onChange(newValue)
    handleClose()
  }

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const inputValue = event.target.value
    
    // Formatar o número conforme o país
    const formatted = formatPhoneNumber(inputValue, selectedCountry)
    setFormattedNumber(formatted)
    
    // Enviar valor completo com DDI
    const digits = inputValue.replace(/\D/g, '')
    const fullValue = selectedCountry.dialCode + digits
    onChange(fullValue)
  }

  // Filtrar países pela busca
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES
    const query = searchQuery.toLowerCase()
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    )
  }, [searchQuery])

  return (
    <>
      <TextField
        label={label}
        value={formattedNumber}
        onChange={handleNumberChange}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={helperText}
        type="tel"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box className="phone-picker__country-selector">
                <IconButton
                  onClick={handleCountryClick}
                  edge="start"
                  size="small"
                  disabled={disabled}
                  className="phone-picker__country-btn"
                  aria-label="Selecionar país"
                >
                  <Typography variant="body2" className="phone-picker__flag">
                    {selectedCountry.flag}
                  </Typography>
                  <Typography variant="body2" className="phone-picker__dial-code">
                    {selectedCountry.dialCode}
                  </Typography>
                  <ExpandMore fontSize="small" className="phone-picker__arrow" />
                </IconButton>
              </Box>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Phone fontSize="small" className="phone-picker__phone-icon" />
            </InputAdornment>
          ),
        }}
        className="phone-picker"
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
        className="phone-picker-popover"
      >
        <Box className="phone-picker__country-list">
          {/* Campo de busca */}
          <Box className="phone-picker__search-container">
            <TextField
              placeholder="Buscar país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              fullWidth
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              className="phone-picker__search"
            />
          </Box>

          {/* Lista de países */}
          <Box className="phone-picker__countries">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <MenuItem
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  selected={selectedCountry.code === country.code}
                  className="phone-picker__country-item"
                >
                  <Typography variant="body2" className="phone-picker__item-flag">
                    {country.flag}
                  </Typography>
                  <ListItemText
                    primary={country.name}
                    secondary={country.dialCode}
                    className="phone-picker__country-text"
                  />
                </MenuItem>
              ))
            ) : (
              <Box className="phone-picker__no-results">
                <Typography variant="body2" color="text.secondary">
                  Nenhum país encontrado
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  )
}

export default PhonePicker

