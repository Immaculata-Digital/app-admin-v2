import type { ReactNode } from 'react'
import { Card, CardContent, Typography, Box, Button, Skeleton } from '@mui/material'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, row: T) => ReactNode
}

interface SimpleTableProps<T> {
  title: string
  data: T[]
  columns: Column<T>[]
  actions?: {
    label: string
    onClick: (item: T) => void
  }
  emptyMessage?: string
  loading?: boolean
}

export function SimpleTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  actions,
  emptyMessage = 'Nenhum dado disponível',
  loading,
}: SimpleTableProps<T>) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton height={32} width="40%" sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={64} />
            ))}
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>

        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {data.map((row, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {columns.map((col) => (
                    <Box key={String(col.key)} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, fontWeight: 500 }}>
                        {col.label}:
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {actions && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => actions.onClick(row)}
                    sx={{ ml: 2 }}
                  >
                    {actions.label}
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

