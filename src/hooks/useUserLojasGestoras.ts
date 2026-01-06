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
        
        // Buscar grupos para verificar se tem ADM-LOJA
        const groups = await accessGroupService.list()
        const admLojaGroup = groups.find(g => g.code === 'ADM-LOJA')
        
        if (admLojaGroup && userData.groupIds.includes(admLojaGroup.id)) {
          setIsAdmLoja(true)
          // Buscar lojas gestoras do usuário
          const lojas = userData.lojasGestoras || []
          setLojasGestoras(Array.isArray(lojas) && lojas.length > 0 ? lojas : null)
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

