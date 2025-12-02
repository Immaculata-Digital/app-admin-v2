// Formata telefone para exibição no formato WhatsApp: +55 (XX) X XXXX-XXXX
export const formatTelefoneWhatsApp = (value?: string): string => {
  if (!value) return '—'
  
  const numbers = value.replace(/\D/g, '')
  
  // Se o número já começa com 55 (código do país), remove para formatar
  const withoutCountry = numbers.startsWith('55') ? numbers.slice(2) : numbers
  
  if (withoutCountry.length <= 2) {
    return `+55 (${withoutCountry})`
  }
  if (withoutCountry.length <= 3) {
    return `+55 (${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2)}`
  }
  if (withoutCountry.length <= 7) {
    return `+55 (${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 3)} ${withoutCountry.slice(3)}`
  }
  return `+55 (${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 3)} ${withoutCountry.slice(3, 7)}-${withoutCountry.slice(7, 11)}`
}

// Gera link do WhatsApp apenas com números
export const getWhatsAppLink = (value?: string): string => {
  if (!value) return '#'
  
  const numbers = value.replace(/\D/g, '')
  
  // Se o número já começa com 55, usa direto, senão adiciona
  const fullNumber = numbers.startsWith('55') ? numbers : `55${numbers}`
  return `https://wa.me/${fullNumber}`
}

