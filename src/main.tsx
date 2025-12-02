import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline } from '@mui/material'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssBaseline />
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

