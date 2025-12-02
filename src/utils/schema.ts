/**
 * Obtém o schema do tenant baseado no subdomínio da URL
 * Fallback: usa SCHEMA_DEFAULT do .env ou "casona"
 */
export const getTenantSchema = (): string => {
  // Tentar obter do subdomínio
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    
    // Se tiver mais de 2 partes (ex: casona.localhost, loja.example.com)
    // O subdomínio é a primeira parte
    if (parts.length > 2) {
      const subdomain = parts[0]
      // Validar que é um nome de schema válido (letras, números, underscore)
      if (subdomain && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(subdomain)) {
        return subdomain
      }
    }
    
    // Se for localhost ou IP, tentar obter do pathname ou query params
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const urlParams = new URLSearchParams(window.location.search)
      const schemaFromQuery = urlParams.get('schema')
      if (schemaFromQuery && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaFromQuery)) {
        return schemaFromQuery
      }
    }
  }
  
  // Fallback: usar variável de ambiente ou "casona"
  const envSchema = import.meta.env.VITE_SCHEMA_DEFAULT
  return envSchema && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(envSchema) ? envSchema : 'casona'
}

