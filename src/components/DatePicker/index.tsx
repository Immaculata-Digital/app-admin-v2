import { useState, useEffect } from 'react'
import {
  TextField,
  Popover,
  Box,
  IconButton,
  Typography,
  Button,
} from '@mui/material'
import { CalendarToday } from '@mui/icons-material'
import './style.css'

type DatePickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  placeholder?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
}

// Normalizar o valor da data para formato YYYY-MM-DD (sem problemas de fuso horário)
const normalizeDate = (dateValue: string): string => {
  if (!dateValue) return ''
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }
  // Tenta converter de outros formatos
  try {
    // Se for uma string de data no formato YYYY-MM-DD, criar data local
    if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      const dateStr = dateValue.substring(0, 10)
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      // Formatar de volta para YYYY-MM-DD
      const yearStr = date.getFullYear().toString()
      const monthStr = (date.getMonth() + 1).toString().padStart(2, '0')
      const dayStr = date.getDate().toString().padStart(2, '0')
      return `${yearStr}-${monthStr}-${dayStr}`
    }
    // Para outros formatos, usar o Date normal
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      // Usar métodos locais para evitar problemas de fuso horário
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  } catch {
    // Se falhar, retorna vazio
  }
  return ''
}

const DatePicker = ({
  label,
  value,
  onChange,
  fullWidth = false,
  placeholder = 'Selecione uma data',
  disabled = false,
  error = false,
  helperText,
}: DatePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  
  const normalizedValue = normalizeDate(value || '')
  const [tempDate, setTempDate] = useState(normalizedValue)

  // Atualizar tempDate quando o valor externo mudar
  useEffect(() => {
    const newNormalized = normalizeDate(value || '')
    setTempDate((currentTempDate) => {
      if (newNormalized !== currentTempDate) {
        return newNormalized
      }
      return currentTempDate
    })
  }, [value])

  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    setAnchorEl(event.currentTarget)
    const currentValue = tempDate || normalizedValue || ''
    setTempDate(currentValue)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDateSelect = (date: Date) => {
    // Formatar data local sem problemas de fuso horário
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`
    setTempDate(formattedDate)
    onChange(formattedDate)
    handleClose()
  }

  const handleTodayClick = () => {
    const today = new Date()
    handleDateSelect(today)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const newValue = event.target.value
    
    // Atualizar o estado local imediatamente
    setTempDate(newValue)
    
    // Passar o valor diretamente para o onChange
    // O input type="date" já valida o formato YYYY-MM-DD
    onChange(newValue)
  }

  // Handler para quando o campo perder o foco
  const handleBlur = () => {
    if (disabled) return
    // Normalizar a data quando o campo perde o foco
    if (tempDate) {
      const normalized = normalizeDate(tempDate)
      if (normalized && normalized !== tempDate) {
        setTempDate(normalized)
        onChange(normalized)
      }
    }
  }

  // Gerar dias do calendário
  const getCalendarDays = () => {
    // Parsear data local sem problemas de fuso horário
    let currentDate: Date
    if (tempDate && /^\d{4}-\d{2}-\d{2}$/.test(tempDate)) {
      const [year, month, day] = tempDate.split('-').map(Number)
      currentDate = new Date(year, month - 1, day)
    } else {
      currentDate = new Date()
    }
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Dias vazios do início do mês
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const calendarDays = getCalendarDays()
  // Parsear data local para exibição do mês/ano
  let currentDate: Date
  if (tempDate && /^\d{4}-\d{2}-\d{2}$/.test(tempDate)) {
    const [year, month, day] = tempDate.split('-').map(Number)
    currentDate = new Date(year, month - 1, day)
  } else {
    currentDate = new Date()
  }
  
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Função para comparar datas sem considerar hora
  const isSameDate = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    const formattedDate = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}`
    setTempDate(formattedDate)
  }

  return (
    <>
      <TextField
        label={label}
        value={tempDate || normalizedValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        fullWidth={fullWidth}
        type="date"
        disabled={disabled}
        error={error}
        helperText={helperText}
        placeholder={placeholder}
        InputLabelProps={{
          shrink: true,
        }}
        InputProps={{
          endAdornment: (
            <IconButton
              onClick={handleClick}
              edge="end"
              size="small"
              aria-label="Abrir calendário"
              disabled={disabled}
              sx={{ mr: -1 }}
            >
              <CalendarToday fontSize="small" />
            </IconButton>
          ),
        }}
        className="date-picker"
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
        className="date-picker-popover"
      >
        <Box className="date-picker-calendar">
          {/* Cabeçalho do calendário */}
          <Box className="date-picker-header">
            <IconButton
              size="small"
              onClick={() => navigateMonth('prev')}
              className="date-picker-nav-btn"
            >
              ←
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>
            <IconButton
              size="small"
              onClick={() => navigateMonth('next')}
              className="date-picker-nav-btn"
            >
              →
            </IconButton>
          </Box>

          {/* Dias da semana */}
          <Box className="date-picker-weekdays">
            {weekDays.map((day) => (
              <Typography
                key={day}
                variant="caption"
                className="date-picker-weekday"
              >
                {day}
              </Typography>
            ))}
          </Box>

          {/* Grid de dias */}
          <Box className="date-picker-days">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <Box key={index} className="date-picker-day-empty" />
              }

              const dayDate = new Date(day)
              dayDate.setHours(0, 0, 0, 0)
              const isToday = isSameDate(dayDate, today)
              
              // Verificar se está selecionado comparando datas locais
              let isSelected = false
              if (tempDate && /^\d{4}-\d{2}-\d{2}$/.test(tempDate)) {
                const [year, month, dayValue] = tempDate.split('-').map(Number)
                const selectedDate = new Date(year, month - 1, dayValue)
                isSelected = isSameDate(dayDate, selectedDate)
              }

              return (
                <Button
                  key={index}
                  className={`date-picker-day ${
                    isToday ? 'date-picker-day--today' : ''
                  } ${isSelected ? 'date-picker-day--selected' : ''}`}
                  onClick={() => handleDateSelect(day)}
                >
                  {day.getDate()}
                </Button>
              )
            })}
          </Box>

          {/* Botão Hoje */}
          <Box className="date-picker-footer">
            <Button
              variant="text"
              size="small"
              onClick={handleTodayClick}
              className="date-picker-today-btn"
            >
              Hoje
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  )
}

export default DatePicker

