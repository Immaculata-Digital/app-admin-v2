import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    CircularProgress,
    Typography,
    Fade
} from '@mui/material'
import { FilterAlt, PlayArrow } from '@mui/icons-material'
import type { ReportConfig, ReportFilterConfig } from '../../config/reports'
import { lojaService, type LojaDTO } from '../../services/lojas'
import { getTenantSchema } from '../../utils/schema'
import './style.css'

interface ReportFilterModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (filters: Record<string, string | number>) => void
    report: ReportConfig | null
}

export function ReportFilterModal({ open, onClose, onConfirm, report }: ReportFilterModalProps) {
    const [filters, setFilters] = useState<Record<string, string | number>>({})
    const [lojas, setLojas] = useState<LojaDTO[]>([])
    const [loadingLojas, setLoadingLojas] = useState(false)

    useEffect(() => {
        if (open && report) {
            // Load from localStorage if exists
            const storageKey = `report_filter_v2_${report.id}`
            const savedFilters = localStorage.getItem(storageKey)

            let initialFilters: Record<string, string | number> = {}

            if (savedFilters) {
                try {
                    initialFilters = JSON.parse(savedFilters)
                } catch (e) {
                    console.error('Erro ao carregar filtros salvos', e)
                }
            }

            // Ensure all report filters are initialized (don't overwrite saved ones unless missing)
            report.filters.forEach(f => {
                if (initialFilters[f.name] === undefined) {
                    initialFilters[f.name] = ''
                }
            })

            setFilters(initialFilters)

            // Fetch lojas if needed
            const needsLojas = report.filters.some(f => f.type === 'loja_select')
            if (needsLojas && lojas.length === 0) {
                setLoadingLojas(true)
                lojaService.list(getTenantSchema(), { limit: 100, offset: 0 })
                    .then(data => {
                        setLojas(data.itens)
                    })
                    .catch(console.error)
                    .finally(() => setLoadingLojas(false))
            }
        }
    }, [open, report])

    const handleChange = (name: string, value: string | number) => {
        setFilters(prev => ({ ...prev, [name]: value }))
    }

    const handleConfirm = () => {
        if (report) {
            const storageKey = `report_filter_v2_${report.id}`
            localStorage.setItem(storageKey, JSON.stringify(filters))
        }

        // Only pass non-empty filters
        const validFilters: Record<string, string | number> = {}
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value !== undefined && value !== null) {
                validFilters[key] = value
            }
        })
        onConfirm(validFilters)
    }

    if (!report) return null

    const renderField = (filter: ReportFilterConfig) => {
        switch (filter.type) {
            case 'date':
                return (
                    <TextField
                        fullWidth
                        type="date"
                        label={filter.label}
                        value={filters[filter.name] || ''}
                        onChange={(e) => handleChange(filter.name, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required={filter.required}
                    />
                )
            case 'text':
                return (
                    <TextField
                        fullWidth
                        label={filter.label}
                        value={filters[filter.name] || ''}
                        onChange={(e) => handleChange(filter.name, e.target.value)}
                        required={filter.required}
                        placeholder={`Digite o ${filter.label.toLowerCase()}`}
                    />
                )
            case 'loja_select':
                return (
                    <TextField
                        select
                        fullWidth
                        label={filter.label}
                        value={filters[filter.name] || ''}
                        onChange={(e) => handleChange(filter.name, e.target.value)}
                        required={filter.required}
                        disabled={loadingLojas}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        {lojas.map(loja => (
                            <MenuItem key={loja.id_loja} value={loja.id_loja}>
                                {loja.nome_loja}
                            </MenuItem>
                        ))}
                    </TextField>
                )
            case 'select':
                return (
                    <TextField
                        select
                        fullWidth
                        label={filter.label}
                        value={filters[filter.name] || ''}
                        onChange={(e) => handleChange(filter.name, e.target.value)}
                        required={filter.required}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="CREDITO">Crédito</MenuItem>
                        <MenuItem value="DEBITO">Débito</MenuItem>
                    </TextField>
                )
            default:
                return null
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            className="report-modal"
            TransitionComponent={Fade}
            transitionDuration={400}
        >
            <DialogTitle className="report-modal__title">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterAlt color="primary" />
                    Configurar Filtros
                </Box>
                <Typography variant="body2" className="report-modal__subtitle">
                    Personalize o relatório <strong>{report.name}</strong> antes de gerar.
                </Typography>
            </DialogTitle>

            <DialogContent>
                {loadingLojas ? (
                    <Box className="report-modal__loading">
                        <CircularProgress size={32} />
                        <Typography variant="body2" color="text.secondary">
                            Carregando opções...
                        </Typography>
                    </Box>
                ) : (
                    <Box className="report-modal__field-container">
                        {report.filters.map(f => (
                            <Box key={f.name}>
                                {renderField(f)}
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>

            <DialogActions className="report-modal__actions">
                <Button onClick={onClose} className="report-modal__btn-cancel">
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    className="report-modal__btn-confirm"
                    endIcon={<PlayArrow />}
                    disabled={loadingLojas}
                >
                    Executar Relatório
                </Button>
            </DialogActions>
        </Dialog>
    )
}
