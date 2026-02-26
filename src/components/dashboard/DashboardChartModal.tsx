import { useState, useEffect, useMemo } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    IconButton,
    List,
    ListItem,
    LinearProgress,
    Avatar,
} from '@mui/material'
import { Close, EmojiEvents } from '@mui/icons-material'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts'
import { dashboardService } from '../../services/dashboard'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardChartModalProps {
    open: boolean
    onClose: () => void
    title: string
    kpi: string
    schema: string
    lojaIds?: number[]
}

export function DashboardChartModal({
    open,
    onClose,
    title,
    kpi,
    schema,
    lojaIds,
}: DashboardChartModalProps) {
    const [period, setPeriod] = useState<number>(7)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any[]>([])

    const loadData = async () => {
        try {
            setLoading(true)
            const chartData = await dashboardService.getChartData(schema, kpi, period, lojaIds)
            setData(chartData)
        } catch (error) {
            console.error('Erro ao carregar dados do gráfico:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open, period, schema, lojaIds, kpi])

    const handlePeriodChange = (
        _event: React.MouseEvent<HTMLElement>,
        newPeriod: number | null
    ) => {
        if (newPeriod !== null) {
            setPeriod(newPeriod)
        }
    }

    const formatLabel = (label: any) => {
        try {
            const labelStr = String(label)
            if (period <= 30) {
                return format(parseISO(labelStr), 'dd/MM', { locale: ptBR })
            }
            if (period === 90) {
                // label is like YYYY-WIW
                return labelStr.split('-W')[1] ? `Sem ${labelStr.split('-W')[1]}` : labelStr
            }
            if (period === 365) {
                // label is like YYYY-MM
                return format(parseISO(`${labelStr}-01`), 'MMM/yy', { locale: ptBR })
            }
            return labelStr
        } catch (e) {
            return String(label)
        }
    }

    const maxRankingValue = useMemo(() => {
        if (kpi !== 'itens-resgatados' || data.length === 0) return 0
        return Math.max(...data.map(d => d.value))
    }, [data, kpi])

    const renderContent = () => {
        if (loading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <CircularProgress />
                </Box>
            )
        }

        if (data.length === 0) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <Typography color="text.secondary">Nenhum dado encontrado para o período.</Typography>
                </Box>
            )
        }

        if (kpi === 'itens-resgatados') {
            return (
                <List sx={{ pt: 2 }}>
                    {data.map((item, index) => {
                        const isTopThree = index < 3
                        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                        const bgColor = isTopThree ? `${rankColors[index]}20` : 'transparent'

                        return (
                            <ListItem
                                key={index}
                                divider={index < data.length - 1}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    px: 2,
                                    py: 2,
                                    borderRadius: 2,
                                    bgcolor: bgColor,
                                    mb: 1,
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        {isTopThree ? (
                                            <Avatar
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    bgcolor: rankColors[index],
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                <EmojiEvents sx={{ fontSize: 18, color: '#fff' }} />
                                            </Avatar>
                                        ) : (
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                color="text.secondary"
                                                sx={{ width: 32, textAlign: 'center' }}
                                            >
                                                {index + 1}º
                                            </Typography>
                                        )}
                                        <Typography variant="body1" fontWeight={600}>
                                            {item.label}
                                        </Typography>
                                    </Box>
                                    <Typography fontWeight={700} color="primary.main">
                                        {item.value.toLocaleString('pt-BR')} qte.
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(item.value / maxRankingValue) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(0,0,0,0.05)',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                            background: isTopThree
                                                ? `linear-gradient(90deg, ${rankColors[index]}, #aaa)`
                                                : 'linear-gradient(90deg, #1976d2, #42a5f5)'
                                        }
                                    }}
                                />
                            </ListItem>
                        )
                    })}
                </List>
            )
        }

        return (
            <Box sx={{ width: '100%', height: 400, pt: 3 }}>
                <ResponsiveContainer>
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#1976d2" stopOpacity={1} />
                                <stop offset="100%" stopColor="#41b2ff" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey="label"
                            tickFormatter={formatLabel}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#666', fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#666' }}
                            tickFormatter={(value) => value.toLocaleString('pt-BR')}
                        />
                        <Tooltip
                            labelFormatter={formatLabel}
                            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                            formatter={(value: any) => [value.toLocaleString('pt-BR'), 'Quantidade']}
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(4px)',
                                padding: '12px'
                            }}
                            labelStyle={{ fontWeight: 700, marginBottom: '4px', color: '#333' }}
                        />
                        <Bar
                            dataKey="value"
                            fill="url(#barGradient)"
                            radius={[6, 6, 0, 0]}
                            animationDuration={1500}
                        >
                            {data.map((_entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    style={{ filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.05))' }}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        )
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.15)'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pt: 3, px: 3 }}>
                <Typography variant="h5" component="div" fontWeight={700} color="text.primary">
                    {title}
                </Typography>
                <IconButton onClick={onClose} size="medium" sx={{ color: 'text.secondary' }}>
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pb: 5, px: 3 }}>
                <Box display="flex" justifyContent="center" mb={4} mt={1}>
                    <ToggleButtonGroup
                        value={period}
                        exclusive
                        onChange={handlePeriodChange}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0,0,0,0.03)',
                            p: 0.5,
                            borderRadius: 2,
                            '& .MuiToggleButton-root': {
                                border: 'none',
                                borderRadius: 1.5,
                                px: 3,
                                mx: 0.2,
                                color: 'text.secondary',
                                fontWeight: 600,
                                '&.Mui-selected': {
                                    bgcolor: '#fff',
                                    color: 'primary.main',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    '&:hover': {
                                        bgcolor: '#fff',
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value={7}>7 Dias</ToggleButton>
                        <ToggleButton value={30}>30 Dias</ToggleButton>
                        <ToggleButton value={90}>90 Dias</ToggleButton>
                        <ToggleButton value={365}>1 Ano</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}
