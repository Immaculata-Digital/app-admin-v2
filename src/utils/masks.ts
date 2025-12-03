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

// Máscara para CPF: 000.000.000-00
export const maskCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 3) {
    return numbers
  }
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  }
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
}

// Remove máscara do CPF
export const unmaskCPF = (value: string): string => {
  return value.replace(/\D/g, '')
}

// Valida CPF
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = unmaskCPF(cpf)
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleanCPF.charAt(10))) return false
  
  return true
}

// Máscara para CNPJ: 00.000.000/0000-00
export const maskCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) {
    return numbers
  }
  if (numbers.length <= 5) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  }
  if (numbers.length <= 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  }
  if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
  }
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
}

// Remove máscara do CNPJ
export const unmaskCNPJ = (value: string): string => {
  return value.replace(/\D/g, '')
}

// Valida CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = unmaskCNPJ(cnpj)
  if (cleanCNPJ.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  let length = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, length)
  const digits = cleanCNPJ.substring(length)
  let sum = 0
  let pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  length = length + 1
  numbers = cleanCNPJ.substring(0, length)
  sum = 0
  pos = length - 7
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

// Máscara para CEP: 00000-000
export const maskCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 5) {
    return numbers
  }
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
}

// Remove máscara do CEP
export const unmaskCEP = (value: string): string => {
  return value.replace(/\D/g, '')
}

// Máscara para telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000
export const maskPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) {
    return numbers.length > 0 ? `(${numbers}` : numbers
  }
  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  }
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

// Remove máscara do telefone
export const unmaskPhone = (value: string): string => {
  return value.replace(/\D/g, '')
}

// Formata valor monetário: R$ 0,00
export const maskCurrency = (value: string | number): string => {
  const numericValue = typeof value === 'string' ? value.replace(/\D/g, '') : String(value).replace(/\D/g, '')
  if (!numericValue) return ''
  
  const number = parseFloat(numericValue) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

// Remove formatação monetária
export const unmaskCurrency = (value: string): string => {
  return value.replace(/\D/g, '')
}

// Converte valor monetário formatado para número
export const currencyToNumber = (value: string): number => {
  const cleanValue = unmaskCurrency(value)
  return cleanValue ? parseFloat(cleanValue) / 100 : 0
}

