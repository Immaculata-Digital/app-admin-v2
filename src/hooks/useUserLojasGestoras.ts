import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/users'
import { accessGroupService } from '../services/accessGroups'

/**
 * Hook para obter as lojas gestoras do usuário logado
 * Retorna as lojas gestoras se o usuário pertencer ao grupo ADM-LOJA
 */
export const useUserLojasGestoras = () => {
  const { user } = useAuth()
  const [lojasGestoras, setLojasGestoras] = useState<number[] | null>(null)
  const [isAdmLoja, setIsAdmLoja] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserLojasGestoras = async () => {
      if (!user?.id) {
        setLojasGestoras(null)
        setIsAdmLoja(false)
        setLoading(false)
        return
      }

      try {
        // Buscar dados completos do usuário
        const userData = await userService.getById(user.id)
        
        // Buscar grupos para verificar se tem ADM-LOJA ou Administrador de Loja
        const groups = await accessGroupService.list()
        
        // Critério flexível para identificar ADM-LOJA (mesma lógica das telas de KPI)
        const isLojaAdmin = groups.some(g => 
          userData.groupIds.includes(g.id) && 
          (g.code === 'ADM-LOJA' || g.name.toUpperCase().includes('LOJA') || g.code.includes('LOJA'))
        )
        
        if (isLojaAdmin) {
          setIsAdmLoja(true)
          
          let ids: number[] = []
          if (Array.isArray(userData.lojasGestoras) && userData.lojasGestoras.length > 0) {
            ids = userData.lojasGestoras
          } else if (user.id_loja) {
            // Se não tem lojasGestoras mas tem id_loja vinculada, usar a id_loja
            ids = [user.id_loja]
          }
          
          setLojasGestoras(ids.length > 0 ? ids : null)
        } else {
          setIsAdmLoja(false)
          setLojasGestoras(null)
        }
      } catch (error) {
        console.error('Erro ao carregar lojas gestoras do usuário:', error)
        setIsAdmLoja(false)
        setLojasGestoras(null)
      } finally {
        setLoading(false)
      }
    }

    loadUserLojasGestoras()
  }, [user?.id])

  return { lojasGestoras, isAdmLoja, loading }
}

