/**
 * Atualiza o favicon da página com uma imagem base64
 * @param logoBase64 - String base64 da imagem (data:image/...)
 */
export const updateFavicon = (logoBase64: string | null | undefined): void => {
  if (!logoBase64) {
    return
  }

  try {
    // Remove o link do favicon existente se houver
    const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (existingLink) {
      existingLink.remove()
    }

    // Cria um novo link para o favicon
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png' // Favicons geralmente são PNG
    link.href = logoBase64

    // Adiciona ao head
    document.head.appendChild(link)

    // Também atualiza apple-touch-icon para dispositivos iOS
    const appleLink = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement
    if (appleLink) {
      appleLink.remove()
    }
    const appleIcon = document.createElement('link')
    appleIcon.rel = 'apple-touch-icon'
    appleIcon.href = logoBase64
    document.head.appendChild(appleIcon)
  } catch (error) {
    console.error('Erro ao atualizar favicon:', error)
  }
}







