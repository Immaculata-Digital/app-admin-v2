import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material'
import { TrendingUp, TrendingDown } from '@mui/icons-material'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  variacao?: number // percentual
  onClick?: () => void
  loading?: boolean
  icon?: React.ReactNode
}

export function KPICard({
  title,
  value,
  subtitle,
  variacao,
  onClick,
  loading,
  icon,
}: KPICardProps) {
  const hasVariacao = variacao !== undefined && variacao !== null
  const isPositive = hasVariacao && variacao > 0
  const isNegative = hasVariacao && variacao < 0

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton height={24} width="60%" sx={{ mb: 2 }} />
          <Skeleton height={40} width="80%" sx={{ mb: 1 }} />
          <Skeleton height={16} width="40%" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': onClick ? {
          boxShadow: 4,
          borderColor: 'primary.main',
        } : {},
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ ml: 2, color: 'primary.main', opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 'auto', pt: hasVariacao ? 2 : 0, minHeight: hasVariacao ? 'auto' : '40px' }}>
          {hasVariacao ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {isPositive && <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />}
              {isNegative && <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary',
                }}
              >
                {isPositive && '+'}
                {variacao.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                vs. período anterior
              </Typography>
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )
}

