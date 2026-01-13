import { type ReactNode, useEffect, useState } from 'react'
import {
  Box,
  Typography,
} from '@mui/material'
import { CheckCircleOutline } from '@mui/icons-material'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { configuracoesService } from '../../services/configuracoes'
import { getTenantSchema } from '../../utils/schema'
import './style.css'

interface AuthTemplateProps {
  // Visual Side Props
  visualTitle: string
  visualDescription: string
  visualFeatures?: string[]
  
  // Form Side Props
  formTitle: string
  formSubtitle: string
  children: ReactNode
  
  // Configuration
  showThemeSwitcher?: boolean
}

export const AuthTemplate = ({
  visualTitle: _visualTitle,
  visualDescription,
  visualFeatures,
  formTitle,
  formSubtitle,
  children,
  showThemeSwitcher = true,
}: AuthTemplateProps) => {
  // Logo fixa do Concordia no lado esquerdo
  const concordiaLogoPath = '/images/completa_branca.png'
  
  // Logo do cliente no lado direito (acima do formulário)
  const [clientLogoBase64, setClientLogoBase64] = useState<string | undefined>(undefined)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const schema = getTenantSchema()
        const config = await configuracoesService.getFirst(schema, { skipAuth: true })
        
        if (config?.logo_base64) {
          setClientLogoBase64(config.logo_base64)
        }
      } catch (err) {
        console.error('Failed to load config:', err)
      }
    }
    fetchConfig()
  }, [])

  return (
    <Box className="auth-template-container">
      {/* Visual Side */}
      <Box className="auth-visual-side">
        <Box className="auth-visual-overlay" />
        <Box className="auth-feature-card">
           <img src={concordiaLogoPath} alt="Logo Concordia" style={{ width: '100%', marginBottom: '12px' }} />
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, lineHeight: 1.6 }}>
             {visualDescription}
          </Typography>
          
          {visualFeatures && visualFeatures.length > 0 && (
            <Box className="auth-feature-list">
               {visualFeatures.map((item, index) => (
                 <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                   <CheckCircleOutline sx={{ color: 'var(--brand-primary)', mr: 1.5, opacity: 0.9 }} fontSize="small"/>
                   <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{item}</Typography>
                 </Box>
               ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Form Side */}
      <Box className="auth-form-side">
        {showThemeSwitcher && (
          <Box 
              sx={{ 
                position: 'absolute', 
                top: '2rem', 
                right: '2rem',
                zIndex: 10
              }}
          >
             <ThemeSwitcher />
          </Box>
        )}

        <Box className="auth-form-container">
          <Box className="login-logo-wrapper" sx={{ mb: 4, justifyContent: 'flex-start' }}>
             {clientLogoBase64 ? (
               <img src={clientLogoBase64} alt="Logo" style={{ maxHeight: 60, maxWidth: '100%' }} />
             ) : (
               <Box sx={{ p: 1.5, bgcolor: 'var(--brand-primary)', borderRadius: '12px', display: 'inline-flex' }}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
               </Box>
             )}
          </Box>
          
          <Box sx={{ mb: 5 }}>
            <Typography className="auth-title">
              {formTitle}
            </Typography>
            <Typography className="auth-subtitle">
              {formSubtitle}
            </Typography>
          </Box>

          {children}
        </Box>
      </Box>
    </Box>
  )
}
