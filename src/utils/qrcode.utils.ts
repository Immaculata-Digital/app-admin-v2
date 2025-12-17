import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import { getTenantSchema } from './schema'

/**
 * Gera a URL de cadastro de cliente baseada no schema e ID da loja
 * @param idLoja ID da loja
 * @returns URL completa para cadastro de cliente
 */
export function getClienteRegistroUrl(idLoja: number): string {
  const schema = getTenantSchema()
  
  // Se o schema for z_demo, usa homolog-app-cliente
  // Caso contrário, usa o próprio schema como subdomínio (removendo z_ se existir)
  let subdomain: string
  if (schema === 'z_demo') {
    subdomain = 'homolog-app-cliente'
  } else {
    // Remove o prefixo z_ se existir e adiciona -app-cliente
    const schemaWithoutPrefix = schema.startsWith('z_') 
      ? schema.substring(2) 
      : schema
    subdomain = `${schemaWithoutPrefix}-app-cliente`
  }
  
  return `https://${subdomain}.immaculatadigital.com.br/registro?id_loja=${idLoja}`
}

/**
 * Gera um QR Code como data URL (base64)
 * @param url URL para codificar no QR Code
 * @returns Promise com a data URL do QR Code
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

/**
 * Gera e faz download de um PDF A4 com QR Code para cadastro de cliente
 * @param idLoja ID da loja
 * @param nomeLoja Nome da loja (para nomear o arquivo e exibir no PDF)
 */
export async function downloadQRCodeClienteRegistro(
  idLoja: number,
  nomeLoja: string
): Promise<void> {
  const url = getClienteRegistroUrl(idLoja)
  const qrCodeDataUrl = await generateQRCodeDataUrl(url)
  
  // Criar PDF A4 (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const pageHeight = 297

  // Cores do sistema (baseadas no design system)
  const primaryColor = [28, 45, 65] // hsl(220 70% 28%) aproximado em RGB
  const textColor = [30, 30, 30]

  // Header com gradiente simulado
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, pageWidth, 60, 'F')

  // Título principal
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('Clube de Recompensas', pageWidth / 2, 30, { align: 'center' })

  // Subtítulo
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text('Entre e ganhe pontos em cada compra!', pageWidth / 2, 45, { align: 'center' })

  // Conteúdo principal
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  
  // Texto de boas-vindas
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Bem-vindo ao nosso Clube!', pageWidth / 2, 90, { align: 'center' })

  // Descrição
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const description = [
    'Escaneie o QR Code abaixo para se cadastrar',
    'e começar a acumular pontos em cada compra.',
    '',
    'Quanto mais você compra, mais pontos você ganha!',
    'Troque seus pontos por recompensas incríveis.'
  ]
  
  let yPos = 105
  description.forEach((line) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' })
    yPos += 7
  })

  // QR Code centralizado
  const qrCodeSize = 80 // mm
  const qrCodeX = (pageWidth - qrCodeSize) / 2
  const qrCodeY = yPos + 10
  
  doc.addImage(qrCodeDataUrl, 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize)

  // Texto abaixo do QR Code
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Escaneie com a câmera do seu celular', pageWidth / 2, qrCodeY + qrCodeSize + 8, { align: 'center' })

  // Informações da loja (se necessário)
  if (nomeLoja) {
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Loja: ${nomeLoja}`, pageWidth / 2, pageHeight - 30, { align: 'center' })
  }

  // Rodapé
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Este QR Code é exclusivo para cadastro no Clube de Recompensas', pageWidth / 2, pageHeight - 15, { align: 'center' })

  // Salvar PDF
  const sanitizedNome = nomeLoja.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const filename = `qrcode_cadastro_${sanitizedNome}_${idLoja}.pdf`
  doc.save(filename)
}

