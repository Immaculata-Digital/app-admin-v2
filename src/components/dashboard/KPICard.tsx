import { Card, CardContent, Box, Typography, Skeleton, Stack } from '@mui/material'
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
  const hasVariacao = variacao !== undefined && variacao !== null && variacao !== 0
  const isPositive = hasVariacao && variacao > 0
  const isNegative = hasVariacao && variacao < 0

  if (loading) {
    return (
      <Card sx={{ borderRadius: 4, border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton height={20} width="60%" sx={{ mb: 2 }} />
          <Skeleton height={48} width="80%" sx={{ mb: 1, borderRadius: 1 }} />
          <Skeleton height={20} width="40%" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="glass-effect"
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 4,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.12)',
          borderColor: 'primary.main',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 600,
              fontSize: '0.9rem',
              letterSpacing: '0.01em'
            }}
          >
            {title}
          </Typography>
          {icon}
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              fontSize: '2.25rem',
              color: 'text.primary',
              letterSpacing: '-0.03em'
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: 'auto' }}>
          {hasVariacao ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.4,
                  borderRadius: '8px',
                  bgcolor: isPositive ? 'rgba(16, 185, 129, 0.1)' : isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  color: isPositive ? '#10b981' : isNegative ? '#ef4444' : 'text.secondary',
                }}
              >
                {isPositive ? (
                  <TrendingUp sx={{ fontSize: 16 }} />
                ) : isNegative ? (
                  <TrendingDown sx={{ fontSize: 16 }} />
                ) : null}
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {isPositive && '+'}
                  {variacao.toFixed(1)}%
                </Typography>
              </Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              >
                vs. período anterior
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ height: 24 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
