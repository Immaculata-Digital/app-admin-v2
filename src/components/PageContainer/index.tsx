import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import './style.css'

type PageContainerProps = {
  children: ReactNode
  title?: string
}

const PageContainer = ({ children, title }: PageContainerProps) => {
  return (
    <Box className="page-container">
      {/* Standardized Title Section */}
      {title && (
        <Box className="page-container__header">
          <Typography variant="h5" fontWeight={600} color="text.primary">
            {title}
          </Typography>
        </Box>
      )}
      
      {/* Content Area */}
      <Box className="page-container__content">
        {children}
      </Box>
    </Box>
  )
}

export default PageContainer
