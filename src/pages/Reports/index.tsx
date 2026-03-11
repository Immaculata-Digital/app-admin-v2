import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    IconButton,
    Tooltip
} from '@mui/material'
import TableCard, { type TableCardColumn } from '../../components/TableCard'
import { ReportFilterModal } from '../../components/ReportFilterModal'
import { reportsConfig, type ReportConfig } from '../../config/reports'
import { adminApi } from '../../services/admin-api'
import { getTenantSchema } from '../../utils/schema'
import { PlayArrow, Print, FileDownload } from '@mui/icons-material'
import { generateAndPrintPDF } from '../../utils/pdfGenerator'
import './style.css'

export default function ReportsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [reportData, setReportData] = useState<any[]>([])
    const [isDataViewOpen, setIsDataViewOpen] = useState(false)

    // Track action type to differentiate between grid view and direct print
    const [actionType, setActionType] = useState<'generate' | 'print'>('generate')

    const handleOpenModal = (report: ReportConfig, action: 'generate' | 'print') => {
        setSelectedReport(report)
        setActionType(action)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedReport(null)
    }

    const handleGenerateReport = useCallback(async (filters: Record<string, string | number>, updateUrl = true) => {
        if (!selectedReport) return

        try {
            const schema = getTenantSchema()
            const queryParams = new URLSearchParams()
            Object.entries(filters).forEach(([col, val]) => queryParams.append(col, String(val)))
            const queryString = queryParams.toString()

            // Update URL search params if needed
            if (updateUrl) {
                const newParams = new URLSearchParams()
                newParams.set('reportId', selectedReport.id)
                Object.entries(filters).forEach(([key, val]) => newParams.set(key, String(val)))
                setSearchParams(newParams)
            }

            const endpoint = `/${schema}${selectedReport.endpoint}${queryString ? `?${queryString}` : ''}`
            const data = await adminApi.get<any[]>(endpoint)

            const dataWithIds = data.map((row, index) => ({ id: index, ...row }))
            setReportData(dataWithIds)
            setIsModalOpen(false)

            if (actionType === 'generate') {
                setIsDataViewOpen(true)
            } else {
                generateAndPrintPDF({
                    title: selectedReport.name,
                    description: selectedReport.description,
                    columns: selectedReport.columns,
                    data: dataWithIds
                })
            }

        } catch (error) {
            console.error('Erro ao gerar relatório', error)
            alert('Houve um erro ao gerar o relatório.')
        }
    }, [selectedReport, actionType, setSearchParams])

    // Load state from URL on mount
    useEffect(() => {
        const reportId = searchParams.get('reportId')
        if (reportId && !isDataViewOpen) {
            const report = reportsConfig.find(r => r.id === reportId)
            if (report) {
                setSelectedReport(report)
                const filters: Record<string, string | number> = {}
                searchParams.forEach((val, key) => {
                    if (key !== 'reportId') filters[key] = val
                })

                // Auto generate if we have filters or if user just wants the modal open
                if (Object.keys(filters).length > 0) {
                    handleGenerateReport(filters, false)
                }
            }
        }
    }, []) // Run once on mount

    const handleDownloadCSV = useCallback(() => {
        if (!selectedReport || reportData.length === 0) return

        const headers = selectedReport.columns.map(col => col.headerName || col.field)
        const csvContent = [
            headers.join(','),
            ...reportData.map(row => 
                selectedReport.columns.map(col => {
                    const val = row[col.field as string];
                    const strVal = String(val ?? '');
                    return `"${strVal.replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n')

        // Include BOM for UTF-8 to ensure proper encoding in tools like Excel
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${selectedReport.name || 'relatorio'}.csv`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [selectedReport, reportData])

    // TableCard configuration for Reports List
    const columns: TableCardColumn<ReportConfig>[] = useMemo(() => [
        { key: 'name', label: 'Nome do Relatório' },
        { key: 'description', label: 'Descrição' },
        {
            key: 'id' as any,
            label: 'Gerar',
            render: (_, report) => (
                <Tooltip title="Gerar Relatório">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(report, 'generate');
                        }}
                        color="primary"
                        size="small"
                    >
                        <PlayArrow />
                    </IconButton>
                </Tooltip>
            )
        },
        {
            key: 'id' as any,
            label: 'Imprimir',
            render: (_, report) => (
                <Tooltip title="Imprimir Relatório">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(report, 'print');
                        }}
                        color="secondary"
                        size="small"
                    >
                        <Print />
                    </IconButton>
                </Tooltip>
            )
        }
    ], [])

    // TableCard configuration for Generic Report Results
    const resultColumns: TableCardColumn<any>[] = useMemo(() => {
        if (!selectedReport) return []
        return selectedReport.columns.map(col => ({
            key: col.field as string,
            label: col.headerName || (col.field as string)
        }))
    }, [selectedReport])

    return (
        <Box sx={{ p: 3 }}>
            {!isDataViewOpen ? (
                <TableCard
                    title="Relatórios"
                    rows={reportsConfig}
                    columns={columns}
                    disableView
                    disableDelete
                    disableSelection
                    disableActionsColumn
                />
            ) : (
                <Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, gap: 2 }}>
                        <Typography variant="h5" fontWeight="700">
                            {selectedReport?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setIsDataViewOpen(false)
                                    setReportData([])
                                    setSearchParams(new URLSearchParams())
                                }}
                            >
                                Voltar para Lista
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<FileDownload />}
                                onClick={handleDownloadCSV}
                                disabled={reportData.length === 0}
                            >
                                Baixar CSV
                            </Button>
                        </Box>
                    </Box>

                    {selectedReport?.id === 'historico-compras' ? (
                        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid var(--color-border-lighter)', overflowX: 'auto' }}>
                            <Table sx={{ minWidth: 650 }} size="small">
                                <TableHead sx={{ bgcolor: 'var(--color-surface-variant)' }}>
                                    <TableRow>
                                        {selectedReport.columns.map((col) => (
                                            <TableCell key={col.field as string} sx={{ fontWeight: 'bold' }}>
                                                {col.headerName}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reportData.length > 0 ? (
                                        reportData.map((row, idx) => (
                                            <TableRow key={row.id || idx} hover>
                                                {selectedReport.columns.map((col) => (
                                                    <TableCell key={col.field as string}>
                                                        {row[col.field as string]}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={selectedReport.columns.length} align="center" sx={{ py: 3 }}>
                                                Nenhum registro encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box className="report-result-container">
                            <TableCard
                                title={selectedReport?.name || 'Relatório'}
                                rows={reportData}
                                columns={resultColumns}
                                onRowClick={undefined}
                                disableSelection
                                disableActionsColumn
                            />
                        </Box>
                    )}
                </Box>
            )}

            <ReportFilterModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleGenerateReport}
                report={selectedReport}
            />
        </Box>
    )
}
