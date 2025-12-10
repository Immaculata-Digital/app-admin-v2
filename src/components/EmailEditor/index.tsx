import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  IconButton,
  TextField,
  Divider,
} from '@mui/material'
import {
  Delete,
  Edit,
  DragIndicator,
  Image,
  Title,
  Link,
  HorizontalRule,
  Add,
} from '@mui/icons-material'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './style.css'

// Variáveis disponíveis do objeto cliente
const CLIENTE_VARIABLES = [
  { label: 'Nome Completo', value: '{{cliente.nome_completo}}' },
  { label: 'Email', value: '{{cliente.email}}' },
  { label: 'WhatsApp', value: '{{cliente.whatsapp}}' },
  { label: 'Saldo de Pontos', value: '{{cliente.saldo}}' },
  { label: 'CEP', value: '{{cliente.cep}}' },
  { label: 'ID do Cliente', value: '{{cliente.id_cliente}}' },
  { label: 'ID da Loja', value: '{{cliente.id_loja}}' },
]

export type EmailElement = 
  | { type: 'text'; id: string; content: string; styles?: { fontSize?: string; color?: string; fontWeight?: string } }
  | { type: 'image'; id: string; src: string; alt: string; width?: string }
  | { type: 'button'; id: string; text: string; url: string; styles?: { backgroundColor?: string; color?: string } }
  | { type: 'divider'; id: string }

type EmailEditorProps = {
  open: boolean
  onClose: () => void
  onSave: (html: string) => void
  initialHtml?: string
}

const SortableItem = ({ element, onEdit, onDelete }: { 
  element: EmailElement
  onEdit: (element: EmailElement) => void
  onDelete: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }


  const getPreview = () => {
    switch (element.type) {
      case 'text':
        return (
          <Typography
            sx={{
              fontSize: element.styles?.fontSize || '16px',
              color: element.styles?.color || '#000',
              fontWeight: element.styles?.fontWeight || 'normal',
            }}
          >
            {element.content || 'Texto vazio'}
          </Typography>
        )
      case 'image':
        return (
          <Box>
            {element.src ? (
              <img
                src={element.src}
                alt={element.alt}
                style={{ maxWidth: element.width || '100%', height: 'auto' }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                [Imagem não configurada]
              </Typography>
            )}
          </Box>
        )
      case 'button':
        return (
          <Button
            variant="contained"
            sx={{
              backgroundColor: element.styles?.backgroundColor || '#1976d2',
              color: element.styles?.color || '#fff',
            }}
          >
            {element.text || 'Botão'}
          </Button>
        )
      case 'divider':
        return <Divider />
      default:
        return null
    }
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        border: '1px solid #e0e0e0',
        '&:hover': { borderColor: '#1976d2' },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
      >
        <DragIndicator color="action" />
      </Box>
      <Box sx={{ flex: 1 }}>{getPreview()}</Box>
      <IconButton size="small" onClick={() => onEdit(element)}>
        <Edit fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => onDelete(element.id)} color="error">
        <Delete fontSize="small" />
      </IconButton>
    </Paper>
  )
}

const ElementPalette = ({ onAdd }: { onAdd: (type: EmailElement['type']) => void }) => {
  const elements = [
    { type: 'text' as const, label: 'Texto', icon: <Title /> },
    { type: 'image' as const, label: 'Imagem', icon: <Image /> },
    { type: 'button' as const, label: 'Botão', icon: <Link /> },
    { type: 'divider' as const, label: 'Separador', icon: <HorizontalRule /> },
  ]

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Elementos
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {elements.map((el) => (
          <Button
            key={el.type}
            variant="outlined"
            startIcon={el.icon}
            onClick={() => onAdd(el.type)}
            sx={{ textTransform: 'none' }}
          >
            {el.label}
          </Button>
        ))}
      </Box>
    </Paper>
  )
}

const ElementEditor = ({
  element,
  open,
  onClose,
  onSave,
}: {
  element: EmailElement | null
  open: boolean
  onClose: () => void
  onSave: (element: EmailElement) => void
}) => {
  const [editedElement, setEditedElement] = useState<EmailElement | null>(null)
  const [textFieldRef, setTextFieldRef] = useState<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (element) {
      // Garantir que os estilos existam para botões
      if (element.type === 'button' && !element.styles) {
        setEditedElement({ ...element, styles: { backgroundColor: '#1976d2', color: '#fff' } })
      } else {
        setEditedElement({ ...element })
      }
    }
  }, [element])

  const handleSave = () => {
    if (editedElement) {
      onSave(editedElement)
      onClose()
    }
  }

  const insertVariable = (variable: string) => {
    if (!editedElement || editedElement.type !== 'text' || !textFieldRef) return
    
    const textarea = textFieldRef
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentContent = editedElement.content
    const newContent = currentContent.substring(0, start) + variable + currentContent.substring(end)
    
    setEditedElement({ ...editedElement, content: newContent } as EmailElement)
    
    // Restaurar o foco e posição do cursor após a variável inserida
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + variable.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  if (!element || !editedElement) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Editar {element.type === 'text' ? 'Texto' : element.type === 'image' ? 'Imagem' : element.type === 'button' ? 'Botão' : 'Separador'}
      </DialogTitle>
      <DialogContent>
        {element.type === 'text' && editedElement.type === 'text' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Variáveis do Cliente
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {CLIENTE_VARIABLES.map((variable) => (
                  <Button
                    key={variable.value}
                    size="small"
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => insertVariable(variable.value)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {variable.label}
                  </Button>
                ))}
              </Box>
            </Box>
            <TextField
              label="Conteúdo"
              multiline
              rows={4}
              fullWidth
              value={editedElement.content}
              onChange={(e) =>
                setEditedElement({ ...editedElement, content: e.target.value } as EmailElement)
              }
              inputRef={setTextFieldRef}
              helperText="Use os botões acima para inserir variáveis do cliente (ex: {{cliente.nome_completo}})"
            />
            <TextField
              label="Tamanho da fonte (ex: 16px, 1.2em)"
              value={editedElement.styles?.fontSize || ''}
              onChange={(e) =>
                setEditedElement({
                  ...editedElement,
                  styles: { ...editedElement.styles, fontSize: e.target.value },
                } as EmailElement)
              }
            />
            <TextField
              label="Cor (ex: #000000, red)"
              value={editedElement.styles?.color || ''}
              onChange={(e) =>
                setEditedElement({
                  ...editedElement,
                  styles: { ...editedElement.styles, color: e.target.value },
                } as EmailElement)
              }
            />
            <TextField
              label="Peso da fonte (normal, bold, 600)"
              value={editedElement.styles?.fontWeight || ''}
              onChange={(e) =>
                setEditedElement({
                  ...editedElement,
                  styles: { ...editedElement.styles, fontWeight: e.target.value },
                } as EmailElement)
              }
            />
          </Box>
        )}

        {element.type === 'image' && editedElement.type === 'image' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="URL da Imagem"
              fullWidth
              value={editedElement.src}
              onChange={(e) =>
                setEditedElement({ ...editedElement, src: e.target.value } as EmailElement)
              }
            />
            <TextField
              label="Texto Alternativo"
              fullWidth
              value={editedElement.alt}
              onChange={(e) =>
                setEditedElement({ ...editedElement, alt: e.target.value } as EmailElement)
              }
            />
            <TextField
              label="Largura (ex: 100%, 300px)"
              fullWidth
              value={editedElement.width || ''}
              onChange={(e) =>
                setEditedElement({ ...editedElement, width: e.target.value } as EmailElement)
              }
            />
          </Box>
        )}

        {element.type === 'button' && editedElement.type === 'button' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Texto do Botão"
              fullWidth
              value={editedElement.text}
              onChange={(e) =>
                setEditedElement({ ...editedElement, text: e.target.value } as EmailElement)
              }
            />
            <TextField
              label="URL"
              fullWidth
              value={editedElement.url}
              onChange={(e) =>
                setEditedElement({ ...editedElement, url: e.target.value } as EmailElement)
              }
            />
            <TextField
              label="Cor de Fundo (ex: #1976d2)"
              fullWidth
              value={editedElement.styles?.backgroundColor || '#1976d2'}
              onChange={(e) => {
                const newStyles = { ...editedElement.styles, backgroundColor: e.target.value }
                setEditedElement({
                  ...editedElement,
                  styles: newStyles,
                } as EmailElement)
              }}
            />
            <TextField
              label="Cor do Texto (ex: #ffffff)"
              fullWidth
              value={editedElement.styles?.color || '#fff'}
              onChange={(e) => {
                const newStyles = { ...editedElement.styles, color: e.target.value }
                setEditedElement({
                  ...editedElement,
                  styles: newStyles,
                } as EmailElement)
              }}
            />
          </Box>
        )}

        {element.type === 'divider' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              O separador não requer configuração adicional.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const EmailEditor = ({ open, onClose, onSave, initialHtml }: EmailEditorProps) => {
  const [elements, setElements] = useState<EmailElement[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingElement, setEditingElement] = useState<EmailElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Função para parsear HTML e converter em elementos
  const parseHTMLToElements = useCallback((html: string): EmailElement[] => {
    if (!html || html.trim() === '') return []
    
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      // Buscar o container principal (div com max-width: 600px)
      const container = doc.body.querySelector('div[style*="max-width"]') || doc.body.querySelector('div') || doc.body
      const elements: EmailElement[] = []
      let elementIndex = 0

      const processNode = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement
          const tagName = element.tagName.toLowerCase()

          // Ignorar o container principal
          if (tagName === 'div' && element === container) {
            Array.from(element.childNodes).forEach(processNode)
            return
          }

          if (tagName === 'p') {
            const style = element.getAttribute('style') || ''
            const fontSize = style.match(/font-size:\s*([^;]+)/)?.[1]?.trim() || '16px'
            const color = style.match(/color:\s*([^;]+)/)?.[1]?.trim() || '#000'
            const fontWeight = style.match(/font-weight:\s*([^;]+)/)?.[1]?.trim() || 'normal'
            const content = element.textContent?.trim() || ''
            
            if (content) {
              elements.push({
                type: 'text',
                id: `text-${Date.now()}-${elementIndex++}`,
                content,
                styles: { fontSize, color, fontWeight },
              })
            }
          } else if (tagName === 'img') {
            // Verificar se a imagem não está dentro de uma div centralizada
            const parent = element.parentElement
            if (parent && parent.tagName.toLowerCase() === 'div') {
              const parentStyle = parent.getAttribute('style') || ''
              // Se a div tem text-align: center, a imagem será processada quando processarmos a div
              if (parentStyle.includes('text-align') && parentStyle.includes('center')) {
                return // Não processar aqui para evitar duplicação
              }
            }
            
            const src = element.getAttribute('src') || ''
            const alt = element.getAttribute('alt') || ''
            const style = element.getAttribute('style') || ''
            const width = style.match(/max-width:\s*([^;]+)/)?.[1]?.trim() || '100%'
            
            if (src) {
              elements.push({
                type: 'image',
                id: `image-${Date.now()}-${elementIndex++}`,
                src,
                alt,
                width,
              })
            }
          } else if (tagName === 'div') {
            // Processar divs que podem conter botões ou imagens
            const link = element.querySelector('a')
            const img = element.querySelector('img')
            const divStyle = element.getAttribute('style') || ''
            const isCentered = divStyle.includes('text-align') && divStyle.includes('center')
            
            if (link) {
              // Extrair estilos do link dentro da div (botão)
              const linkElement = link as HTMLElement
              const url = linkElement.getAttribute('href') || ''
              const text = linkElement.textContent?.trim() || ''
              const style = linkElement.getAttribute('style') || ''
              // Extrair background-color
              const backgroundColorMatch = style.match(/background-color:\s*([^;]+)/)
              const backgroundColor = backgroundColorMatch?.[1]?.trim() || '#1976d2'
              // Extrair color (dividir por ; e procurar especificamente por "color:")
              const styleParts = style.split(';').map(s => s.trim())
              let color = '#fff'
              for (const part of styleParts) {
                // Verificar se começa exatamente com "color:" (não "background-color:")
                if (part.startsWith('color:') && !part.includes('background')) {
                  color = part.replace(/^color:\s*/, '').trim()
                  break
                }
              }
              
              // Aceitar botão se tiver texto (URL pode estar vazia)
              if (text) {
                elements.push({
                  type: 'button',
                  id: `button-${Date.now()}-${elementIndex++}`,
                  text,
                  url: url || '', // Garantir que seja string vazia se não houver URL
                  styles: { backgroundColor, color },
                })
              }
              // Não processar filhos recursivamente se já processamos o link
            } else if (img && isCentered) {
              // Processar imagem dentro da div centralizada
              const imgElement = img as HTMLElement
              const src = imgElement.getAttribute('src') || ''
              const alt = imgElement.getAttribute('alt') || ''
              const style = imgElement.getAttribute('style') || ''
              const width = style.match(/max-width:\s*([^;]+)/)?.[1]?.trim() || '100%'
              
              if (src) {
                elements.push({
                  type: 'image',
                  id: `image-${Date.now()}-${elementIndex++}`,
                  src,
                  alt,
                  width,
                })
              }
              // Não processar filhos recursivamente se já processamos a imagem
            } else {
              // Se for uma div sem link nem imagem centralizada, processar filhos recursivamente
              Array.from(element.childNodes).forEach(processNode)
            }
          } else if (tagName === 'a') {
            // Ignorar links soltos (não são botões do editor, que sempre estão dentro de divs)
            // Não processar recursivamente para evitar duplicação
          } else if (tagName === 'hr') {
            elements.push({
              type: 'divider',
              id: `divider-${Date.now()}-${elementIndex++}`,
            })
          } else {
            // Processar outros elementos recursivamente
            Array.from(element.childNodes).forEach(processNode)
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim()
          if (text && text.length > 0) {
            elements.push({
              type: 'text',
              id: `text-${Date.now()}-${elementIndex++}`,
              content: text,
            })
          }
        }
      }

      Array.from(container.childNodes).forEach(processNode)
      return elements
    } catch (error) {
      console.error('Erro ao parsear HTML:', error)
      return []
    }
  }, [])

  // Parse HTML inicial quando o modal abrir
  useEffect(() => {
    if (open) {
      // Resetar sempre que o modal abrir
      setElements([])
      
      if (initialHtml && initialHtml.trim() !== '') {
        const parsedElements = parseHTMLToElements(initialHtml)
        if (parsedElements.length > 0) {
          setElements(parsedElements)
        }
      }
    }
  }, [open, initialHtml, parseHTMLToElements])
  
  // Resetar elementos quando o modal fechar
  useEffect(() => {
    if (!open) {
      setElements([])
      setEditingElement(null)
      setActiveId(null)
    }
  }, [open])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }

  const handleAddElement = (type: EmailElement['type']) => {
    const newElement: EmailElement = (() => {
      switch (type) {
        case 'text':
          return { type: 'text', id: `text-${Date.now()}`, content: 'Novo texto' }
        case 'image':
          return { type: 'image', id: `image-${Date.now()}`, src: '', alt: '' }
        case 'button':
          return { type: 'button', id: `button-${Date.now()}`, text: 'Clique aqui', url: '', styles: { backgroundColor: '#1976d2', color: '#fff' } }
        case 'divider':
          return { type: 'divider', id: `divider-${Date.now()}` }
      }
    })()
    setElements([...elements, newElement])
  }

  const handleEditElement = (element: EmailElement) => {
    setEditingElement(element)
  }

  const handleSaveElement = (element: EmailElement) => {
    setElements((items) =>
      items.map((item) => (item.id === element.id ? element : item))
    )
    setEditingElement(null)
  }

  const handleDeleteElement = (id: string) => {
    setElements((items) => items.filter((item) => item.id !== id))
  }

  const generateHTML = useCallback(() => {
    let html = '<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">'

    elements.forEach((element) => {
      switch (element.type) {
        case 'text':
          html += `<p style="font-size: ${element.styles?.fontSize || '16px'}; color: ${element.styles?.color || '#000'}; font-weight: ${element.styles?.fontWeight || 'normal'}; margin: 10px 0;">${element.content}</p>`
          break
        case 'image':
          html += `<div style="text-align: center; margin: 20px 0;">
            <img src="${element.src}" alt="${element.alt}" style="max-width: ${element.width || '100%'}; height: auto; display: block; margin: 0 auto;" />
          </div>`
          break
        case 'button':
          html += `<div style="margin: 20px 0; text-align: center;">
            <a href="${element.url}" style="display: inline-block; padding: 12px 24px; background-color: ${element.styles?.backgroundColor || '#1976d2'}; color: ${element.styles?.color || '#fff'}; text-decoration: none; border-radius: 4px;">${element.text}</a>
          </div>`
          break
        case 'divider':
          html += '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />'
          break
      }
    })

    html += '</div>'
    return html
  }, [elements])

  const handleSave = () => {
    const html = generateHTML()
    onSave(html)
    onClose()
  }

  const handleClose = () => {
    setElements([])
    setEditingElement(null)
    onClose()
  }

  // Gerar HTML para pré-visualização em tempo real
  const previewHTML = useMemo(() => generateHTML(), [elements, generateHTML])

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullScreen>
        <DialogContent sx={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ElementPalette onAdd={handleAddElement} />
            
            <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Elementos do Email
                </Typography>
                <Paper sx={{ p: 2, flex: 1, bgcolor: '#f5f5f5', overflow: 'auto', minHeight: 0 }}>
                  {elements.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                      Clique nos botões acima para adicionar elementos ao email
                    </Typography>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={elements.map((el) => el.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {elements.map((element) => (
                          <SortableItem
                            key={element.id}
                            element={element}
                            onEdit={handleEditElement}
                            onDelete={handleDeleteElement}
                          />
                        ))}
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <Paper sx={{ p: 2, opacity: 0.8 }}>
                            Arrastando...
                          </Paper>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </Paper>
              </Box>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Pré-visualização
                </Typography>
                <Paper 
                  sx={{ 
                    p: 2, 
                    flex: 1,
                    bgcolor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    overflow: 'auto',
                    minHeight: 0,
                  }}
                >
                  {elements.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                      A pré-visualização aparecerá aqui quando você adicionar elementos
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        '& *': {
                          maxWidth: '100%',
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: previewHTML }}
                    />
                  )}
                </Paper>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={elements.length === 0}>
            Salvar HTML
          </Button>
        </DialogActions>
      </Dialog>

      <ElementEditor
        element={editingElement}
        open={!!editingElement}
        onClose={() => setEditingElement(null)}
        onSave={handleSaveElement}
      />
    </>
  )
}

