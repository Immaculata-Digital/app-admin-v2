import { useEffect } from 'react'
import { configuracoesService } from '../../services/configuracoes'
import { getTenantSchema } from '../../utils/schema'
import { updateFavicon } from '../../utils/favicon'

/**
 * Componente que carrega as configurações do cliente e atualiza o favicon
 * Deve ser renderizado uma vez no início da aplicação
 */
export const FaviconUpdater = () => {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        const schema = getTenantSchema()
        const config = await configuracoesService.getFirst(schema, { skipAuth: true })
        
        if (config?.logo_base64) {
          updateFavicon(config.logo_base64)
        }
      } catch (error) {
        console.error('Erro ao carregar favicon das configurações:', error)
        // Em caso de erro, mantém o favicon padrão
      }
    }

    loadFavicon()
  }, [])

  return null // Componente não renderiza nada
}







