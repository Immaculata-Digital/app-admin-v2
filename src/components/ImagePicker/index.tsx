import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Button,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material'
import {
  CloudUpload,
  Close,
  Image as ImageIcon,
} from '@mui/icons-material'
import './style.css'

type ImagePickerProps = {
  label?: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  maxSizeMB?: number
  maxWidth?: number
  maxHeight?: number
}

const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Redimensionar se for muito grande
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height / width) * maxWidth
            width = maxWidth
          } else {
            width = (width / height) * maxHeight
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Erro ao processar imagem'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Gerar base64 - usar JPEG para melhor compressão, PNG para transparência
        const originalType = file.type || 'image/png'
        let mimeType = 'image/jpeg'
        let quality = 0.85
        
        // Se for PNG com transparência ou WebP, manter PNG
        if (originalType === 'image/png' || originalType === 'image/webp') {
          mimeType = 'image/png'
          quality = 1
        }
        
        const compressedBase64 = canvas.toDataURL(mimeType, quality)
        resolve(compressedBase64)
      }
      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
  })
}

const ImagePicker = ({
  label,
  value = '',
  onChange,
  fullWidth = false,
  disabled = false,
  error = false,
  helperText,
  required = false,
  maxSizeMB = 5,
  maxWidth = 800,
  maxHeight = 800,
}: ImagePickerProps) => {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(value || null)
  }, [value])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      setErrorMessage('Apenas imagens PNG, JPEG ou WEBP são permitidas')
      return
    }

    // Validar tamanho
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      setErrorMessage(`A imagem deve ter no máximo ${maxSizeMB}MB`)
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      // Comprimir e redimensionar a imagem
      const compressedBase64 = await compressImage(file, maxWidth, maxHeight)
      setPreview(compressedBase64)
      onChange(compressedBase64)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar imagem')
      console.error('Erro ao processar imagem:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onChange('')
    setErrorMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (disabled || loading) return
    fileInputRef.current?.click()
  }

  const showError = error || Boolean(errorMessage)

  return (
    <Box className="image-picker-container">
      {label && (
        <Typography
          variant="body2"
          component="label"
          className={`image-picker__label ${required ? 'image-picker__label--required' : ''} ${showError ? 'image-picker__label--error' : ''}`}
        >
          {label}
        </Typography>
      )}

      <Box className="image-picker">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || loading}
          style={{ display: 'none' }}
        />

        {preview ? (
          <Box className="image-picker__preview-container">
            <Box className="image-picker__preview">
              <img
                src={preview}
                alt="Preview"
                className="image-picker__preview-img"
              />
              {!disabled && (
                <IconButton
                  className="image-picker__remove-btn"
                  onClick={handleRemove}
                  size="small"
                  disabled={loading}
                >
                  <Close fontSize="small" />
                </IconButton>
              )}
              {loading && (
                <Box className="image-picker__loading-overlay">
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClick}
              disabled={disabled || loading}
              className="image-picker__change-btn"
              startIcon={<CloudUpload />}
            >
              Alterar Imagem
            </Button>
          </Box>
        ) : (
          <Box
            className={`image-picker__upload-area ${showError ? 'image-picker__upload-area--error' : ''} ${disabled ? 'image-picker__upload-area--disabled' : ''}`}
            onClick={handleClick}
          >
            {loading ? (
              <Box className="image-picker__loading">
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Processando imagem...
                </Typography>
              </Box>
            ) : (
              <>
                <ImageIcon className="image-picker__upload-icon" />
                <Typography variant="body2" className="image-picker__upload-text">
                  Clique para fazer upload
                </Typography>
                <Typography variant="caption" color="text.secondary" className="image-picker__upload-hint">
                  PNG, JPEG ou WEBP (máx. {maxSizeMB}MB)
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>

      {(helperText || errorMessage) && (
        <Typography
          variant="caption"
          className={`image-picker__helper ${showError ? 'image-picker__helper--error' : ''}`}
        >
          {errorMessage || helperText}
        </Typography>
      )}
    </Box>
  )
}

export default ImagePicker

