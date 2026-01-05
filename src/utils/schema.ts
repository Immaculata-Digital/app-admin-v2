/**
 * Obtém o schema do tenant baseado no subdomínio da URL
 * 
 * Padrões suportados:
 * - HOMOLOG: homolog-nome-admin.concordiaerp.com → extrai "nome"
 * - PROD: nome-admin.concordiaerp.com → extrai "nome"
 * 
 * Fallback: usa SCHEMA_DEFAULT do .env ou "thiago"
 */
export const getTenantSchema = (): string => {
  // Tentar obter do subdomínio
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Se for um domínio concordiaerp.com (homolog ou prod)
    if (hostname.includes('.concordiaerp.com')) {
      // Remove o domínio base
      let schema = hostname.replace('.concordiaerp.com', '')
      
      // Remove prefixo "homolog-" se existir
      if (schema.startsWith('homolog-')) {
        schema = schema.replace('homolog-', '')
      }
      
      // Remove sufixo "-admin" se existir
      if (schema.endsWith('-admin')) {
        schema = schema.replace('-admin', '')
      }
      
      // Validar que é um nome de schema válido (letras, números, underscore, hífen)
      if (schema && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(schema)) {
        console.log('[getTenantSchema] Schema extraído da URL:', {
          hostname,
          schema,
          origem: 'concordiaerp.com'
        })
        return schema
      }
    }
    
    // Se for localhost ou IP, tentar obter do pathname ou query params
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const urlParams = new URLSearchParams(window.location.search)
      const schemaFromQuery = urlParams.get('schema')
      if (schemaFromQuery && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaFromQuery)) {
        console.log('[getTenantSchema] Schema extraído da query string:', {
          hostname,
          schema: schemaFromQuery,
          origem: 'query params'
        })
        return schemaFromQuery
      }
    }
    
    // Fallback: tentar extrair do subdomínio (para desenvolvimento)
    const parts = hostname.split('.')
    if (parts.length > 2) {
      const subdomain = parts[0]
      if (subdomain && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(subdomain)) {
        console.log('[getTenantSchema] Schema extraído do subdomínio:', {
          hostname,
          schema: subdomain,
          origem: 'subdomínio'
        })
        return subdomain
      }
    }
  }
  
  // Fallback: usar variável de ambiente ou "thiago"
  const envSchema = import.meta.env.VITE_SCHEMA_DEFAULT
  const finalSchema = envSchema && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(envSchema) ? envSchema : 'thiago'
  console.log('[getTenantSchema] Schema usando fallback:', {
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    schema: finalSchema,
    origem: 'fallback (env ou padrão)'
  })
  return finalSchema
}

