import { useEffect, useState, useRef } from 'react'
import { 
  Box, 
  Typography, 
  Grid, 
  Stack, 
  useTheme, 
  Paper,
  MenuItem, 
  Select, 
  Button, 
  CircularProgress,
  IconButton,
  Tooltip as MuiTooltip,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material'
import { 
  StoreOutlined, 
  MyLocationOutlined,
  ZoomOutMapOutlined,
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material'
import { dashboardService } from '../../../services/dashboard'
import { lojaService, type LojaDTO } from '../../../services/lojas'
import { getTenantSchema } from '../../../utils/schema'
import { userService } from '../../../services/users'
import { accessGroupService } from '../../../services/accessGroups'
import { useAuth } from '../../../context/AuthContext'

// Leaflet CDN assets
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

interface MarkerData {
  lat: number
  lng: number
  title: string
  subtitle?: string
  type: 'loja' | 'cliente'
  total?: number
}

const MapaKPIPage = () => {
  const theme = useTheme()
  const mapRef = useRef<any>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [lojas, setLojas] = useState<LojaDTO[]>([])
  const [selectedLojas, setSelectedLojas] = useState<string[]>(['all'])
  const [loading, setLoading] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lojasGestoras, setLojasGestoras] = useState<number[]>([])
  const [isLojaAdmin, setIsLojaAdmin] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const { user } = useAuth()
  
  const tenantSchema = getTenantSchema()

  // Carregar dados de autorização e lojas
  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      try {
        // 1. Fetch user detail and groups
        const userDetail = await userService.getById(user.id)
        const allGroups = await accessGroupService.list()
        const userGroups = allGroups.filter(g => (userDetail.groupIds || []).includes(g.id))
        
        // Flexible check for ADM-LOJA role
        const isLojistaRole = userGroups.some(g => {
          const name = g.name.toUpperCase()
          return name === 'ADM-LOJA' || name === 'ADM_LOJA' || name.includes('ADMINISTRADOR DE LOJA')
        })
        const managedIds = userDetail.lojasGestoras || []
        
        // Determine if restricted based on role or if they have managed stores but aren't global admins
        const isRestricted = isLojistaRole || (managedIds.length > 0 && !userGroups.some(g => {
          const name = g.name.toUpperCase()
          return name === 'ADM-TECH' || name === 'ADM-FRANQUIA'
        }))
        
        setIsLojaAdmin(isRestricted)
        setLojasGestoras(managedIds)

        // 2. Fetch lojas list
        const response = await lojaService.list(tenantSchema, { limit: 100, offset: 0 })
        let allLojas = response.itens || []
        
        // 3. APPLY FILTER IF RESTRICTED
        if (isRestricted) {
          allLojas = allLojas.filter(l => l.id_loja && managedIds.includes(l.id_loja))
        }
        
        setLojas(allLojas)
      } catch (err) {
        console.error('Erro ao carregar dados iniciais do mapa:', err)
      } finally {
        setIsAuthLoading(false)
      }
    }
    loadData()
  }, [tenantSchema, user])

  // Injetar Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).L) {
      setMapLoaded(true)
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = LEAFLET_CSS
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Limpeza opcional se necessário
    }
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return

    const L = (window as any).L
    if (!L) return

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false
    }).setView([-15.7801, -47.9292], 4) // Brasil Central

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)
  }, [mapLoaded])

  // Função para Geocodificação de Endereço Completo (via Nominatim)
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
      const data = await resp.json()
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      }
    } catch (error) {
      console.error(`Erro Geocoding Endereço via Nominatim:`, error)
    }
    return null
  }

  // Função para Geocodificação de CEP (via AwesomeAPI ou fallback)
  const geocodeCep = async (cep: string): Promise<{ lat: number; lng: number } | null> => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return null

    try {
      // AwesomeAPI é gratuita e excelente para CEPs no Brasil
      const response = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`)
      if (response.ok) {
        const data = await response.json()
        if (data.lat && data.lng) {
          return { lat: parseFloat(data.lat), lng: parseFloat(data.lng) }
        }
      }
    } catch (error) {
      console.warn(`Erro Geocoding CEP ${cep} via AwesomeAPI:`, error)
    }

    // Fallback: Nominatim
    return geocodeAddress(cleanCep + ', Brazil')
  }

  const handleSearch = async () => {
    if (isAuthLoading || selectedLojas.length === 0 || !mapInstance.current) return

    setLoading(true)

    try {
      // Determinar quais IDs enviar
      let idsToSend: number[] = []
      if (selectedLojas.includes('all')) {
        if (isLojaAdmin) {
          idsToSend = lojasGestoras.length > 0 ? lojasGestoras : [-1]
        } else {
          idsToSend = lojas.map(l => l.id_loja).filter((id): id is number => !!id)
        }
      } else {
        idsToSend = selectedLojas.map(id => Number(id))
      }

      if (idsToSend.length === 0) {
        setLoading(false)
        return
      }

      const response = await dashboardService.getMapData(tenantSchema, idsToSend)
      const newMarkers: MarkerData[] = []

      // 1. Geocodificar Lojas
      for (const loja of response.lojas) {
        const coordsLoja = await geocodeAddress(loja.endereco_completo)
        if (coordsLoja) {
          newMarkers.push({
            ...coordsLoja,
            type: 'loja',
            title: loja.nome_loja,
            subtitle: loja.endereco_completo
          })
        } else {
          const lojaCep = loja.endereco_completo.match(/\d{5}-?\d{3}/)?.[0]
          if (lojaCep) {
            const coords = await geocodeCep(lojaCep)
            if (coords) {
              newMarkers.push({
                ...coords,
                type: 'loja',
                title: loja.nome_loja,
                subtitle: loja.endereco_completo
              })
            }
          }
        }
      }

      // 2. Geocodificar Clientes (lote limitado por performance e rate limit)
      const clientsWithCep = response.clientes.filter(c => c.cep && c.cep.length >= 8)
      const maxClients = 70
      for (let i = 0; i < Math.min(clientsWithCep.length, maxClients); i++) {
        const c = clientsWithCep[i]
        const coords = await geocodeCep(c.cep)
        if (coords) {
          newMarkers.push({
            ...coords,
            type: 'cliente',
            title: `CEP: ${c.cep}`,
            subtitle: `${c.total} cliente(s)`,
            total: c.total
          })
        }
        // Pequena pausa para respeitar APIs públicas
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 200))
      }

      setMarkers(newMarkers)
      renderMarkers(newMarkers)

    } catch (err) {
      console.error('Erro ao buscar dados do mapa:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderMarkers = (data: MarkerData[]) => {
    const L = (window as any).L
    if (!L || !mapInstance.current) return

    // Limpar marcadores antigos
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const group = L.featureGroup()

    // Definir ícones
    const purpleIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    data.forEach(m => {
      const marker = L.marker([m.lat, m.lng], {
        icon: m.type === 'loja' ? purpleIcon : greenIcon
      }).addTo(mapInstance.current)

      marker.bindPopup(`
        <div style="font-family: Outfit, sans-serif; padding: 5px;">
          <strong style="color: ${m.type === 'loja' ? '#8b5cf6' : '#10b981'}; font-size: 14px;">
            ${m.type === 'loja' ? '📍 Loja: ' : '👥 Clientes: '}${m.title}
          </strong>
          <p style="margin: 5px 0 0; color: #666; font-size: 12px;">${m.subtitle}</p>
        </div>
      `)

      markersRef.current.push(marker)
      group.addLayer(marker)
    })

    if (data.length > 0) {
      mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] })
    }
  }

  const handleResetZoom = () => {
    if (markersRef.current.length > 0 && mapInstance.current) {
      const L = (window as any).L
      const group = L.featureGroup(markersRef.current)
      mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] })
    }
  }

  const handleLojaChange = (event: any) => {
    const value = event.target.value
    if (value.includes('all')) {
      if (selectedLojas.includes('all') && value.length > 1) {
        setSelectedLojas(value.filter((v: string) => v !== 'all'))
      } else {
        setSelectedLojas(['all'])
      }
    } else {
      if (value.length === 0) {
        setSelectedLojas(['all'])
      } else {
        setSelectedLojas(value)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`)
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (mapInstance.current) {
        setTimeout(() => mapInstance.current.invalidateSize(), 300)
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        p: { xs: 2, md: 4 }, 
        height: isFullscreen ? '100vh' : 'calc(100vh - 100px)', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: isFullscreen ? (theme.palette.mode === 'dark' ? '#0a0a0a' : '#f8f9fc') : 'transparent',
        overflow: 'auto'
      }}
    >
      <Paper elevation={0} sx={{ 
        p: 2, 
        mb: 2, 
        borderRadius: 4, 
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 1100
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex' }}>
                <StoreOutlined fontSize="small" />
              </Box>
              <Select
                fullWidth
                size="small"
                multiple
                value={selectedLojas}
                onChange={handleLojaChange}
                input={<OutlinedInput size="small" />}
                renderValue={(selected) => {
                  if (selected.includes('all')) return 'Todas as Lojas'
                  if (selected.length === 1) {
                    return lojas.find(l => String(l.id_loja) === selected[0])?.nome_loja || ''
                  }
                  return `${selected.length} lojas selecionadas`
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                      zIndex: 13000 // Garantir acima do fullscreen do navegador
                    }
                  },
                  // Fix para aparecer no modo fullscreen do navegador
                  container: containerRef.current
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">
                  <Checkbox checked={selectedLojas.includes('all')} />
                  <ListItemText primary="Todas as Lojas" />
                </MenuItem>
                {lojas.map(loja => (
                  <MenuItem key={loja.id_loja} value={String(loja.id_loja)}>
                    <Checkbox checked={selectedLojas.includes(String(loja.id_loja))} />
                    <ListItemText primary={loja.nome_loja} />
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <MyLocationOutlined />}
              onClick={handleSearch}
              disabled={loading}
              sx={{ 
                height: 40, 
                borderRadius: 2,
                bgcolor: '#8b5cf6',
                '&:hover': { bgcolor: '#7c3aed' },
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              {loading ? 'Buscando...' : 'Visualizar no Mapa'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ flex: 1, position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
        <Box 
          ref={mapRef} 
          sx={{ 
            width: '100%', 
            height: '100%', 
            zIndex: 1,
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'
          }} 
        />
        
        {selectedLojas.length === 0 && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 2, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(4px)',
            color: 'text.secondary'
          }}>
            <ZoomOutMapOutlined sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" fontWeight={700}>Mapa pronto para uso</Typography>
            <Typography variant="body2">Selecione uma unidade acima para começar</Typography>
          </Box>
        )}

        {mapInstance.current && (
          <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 2 }}>
             <MuiTooltip title={isFullscreen ? "Sair da Tela Cheia" : "Ver em Tela Cheia"}>
                <IconButton 
                  onClick={toggleFullscreen}
                  sx={{ 
                    bgcolor: 'background.paper', 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    '&:hover': { bgcolor: '#f8f9fa' }
                  }}
                >
                  {isFullscreen ? <FullscreenExit color="primary" /> : <Fullscreen color="primary" />}
                </IconButton>
             </MuiTooltip>

             {markers.length > 0 && (
               <MuiTooltip title="Centralizar Visualização">
                  <IconButton 
                    onClick={handleResetZoom}
                    sx={{ 
                      bgcolor: 'background.paper', 
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      '&:hover': { bgcolor: '#f8f9fa' }
                    }}
                  >
                    <MyLocationOutlined color="primary" />
                  </IconButton>
               </MuiTooltip>
             )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default MapaKPIPage
