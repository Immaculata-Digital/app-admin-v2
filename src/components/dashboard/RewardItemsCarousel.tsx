import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  CardGiftcard,
  ImageNotSupported,
} from '@mui/icons-material'
import { itemRecompensaService, type ItemRecompensaDTO } from '../../services/itensRecompensa'
import { getTenantSchema } from '../../utils/schema'
import './RewardItemsCarousel.css'

export const RewardItemsCarousel = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [items, setItems] = useState<ItemRecompensaDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  const itemsPerPage = isMobile ? 1 : 3

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true)
        const response = await itemRecompensaService.list(getTenantSchema(), { limit: 100, offset: 0 })
        setItems(response.itens)
      } catch (error) {
        console.error('Erro ao carregar itens de recompensa:', error)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [])

  const maxIndex = Math.max(0, items.length - itemsPerPage)

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  const visibleItems = items.slice(currentIndex, currentIndex + itemsPerPage)

  if (loading) {
    return (
      <Card className="glass-effect reward-carousel-card">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CardGiftcard sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600}>
              Itens de Recompensa
            </Typography>
          </Box>
          <Box display="flex" gap={2} justifyContent="center">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <Box key={index} className="reward-item-skeleton">
                <Skeleton variant="rectangular" width="100%" height={140} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" width="80%" height={28} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" height={20} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="glass-effect reward-carousel-card">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CardGiftcard sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600}>
              Itens de Recompensa
            </Typography>
          </Box>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={4}
            color="text.secondary"
          >
            <ImageNotSupported sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">Nenhum item de recompensa cadastrado.</Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect reward-carousel-card">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <CardGiftcard sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600}>
              Itens de Recompensa
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({items.length} {items.length === 1 ? 'item' : 'itens'})
            </Typography>
          </Box>
          <Box display="flex" gap={0.5}>
            <IconButton
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              size="small"
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
                '&.Mui-disabled': { opacity: 0.3 },
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              size="small"
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
                '&.Mui-disabled': { opacity: 0.3 },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        <Box className="reward-carousel-container">
          <Box
            className="reward-carousel-track"
            sx={{
              display: 'flex',
              gap: 2,
              transition: 'transform 0.3s ease-in-out',
            }}
          >
            {visibleItems.map((item) => (
              <Box
                key={item.id_item_recompensa}
                className="reward-item-card"
                sx={{
                  flex: isMobile ? '0 0 100%' : '0 0 calc(33.333% - 11px)',
                  minWidth: 0,
                }}
              >
                <Box className="reward-item-image-container">
                  {item.imagem_item ? (
                    <Box
                      component="img"
                      src={item.imagem_item}
                      alt={item.nome_item}
                      className="reward-item-image"
                    />
                  ) : (
                    <Box className="reward-item-no-image">
                      <ImageNotSupported sx={{ fontSize: 40, opacity: 0.4 }} />
                    </Box>
                  )}
                  <Box className="reward-item-points-badge">
                    {item.quantidade_pontos.toLocaleString('pt-BR')} pts
                  </Box>
                </Box>
                <Box className="reward-item-content">
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    className="reward-item-name"
                    title={item.nome_item}
                  >
                    {item.nome_item}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="reward-item-description"
                    title={item.descricao}
                  >
                    {item.descricao}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Indicadores de página */}
        {items.length > itemsPerPage && (
          <Box display="flex" justifyContent="center" gap={0.5} mt={2}>
            {Array.from({ length: Math.ceil(items.length / itemsPerPage) }).map((_, index) => {
              const isActive = Math.floor(currentIndex / itemsPerPage) === index
              return (
                <Box
                  key={index}
                  onClick={() => setCurrentIndex(index * itemsPerPage)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isActive ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.main' : 'action.hover',
                      transform: 'scale(1.2)',
                    },
                  }}
                />
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
