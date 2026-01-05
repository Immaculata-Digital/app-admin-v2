import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  useMediaQuery,
  useTheme,
  Box,
  Tooltip,
} from '@mui/material'
import {
  Inventory2Outlined,
  PeopleAltOutlined,
  AdminPanelSettingsOutlined,
  Groups2Outlined,
  ChevronLeft,
  ChevronRight,
  MailOutlined,
  EmailOutlined,
  ContactMailOutlined,
  SendOutlined,
  StarsOutlined,
  StoreOutlined,
  BusinessOutlined,
  Settings,
} from '@mui/icons-material'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { configuracoesService } from '../../services/configuracoes'
import { getTenantSchema } from '../../utils/schema'
import { ThemeSwitcher } from '../ThemeSwitcher'
import './style.css'

// Ícone customizado que combina Mail e Settings
const SettingsMailIcon = () => (
  <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <MailOutlined sx={{ fontSize: 'inherit' }} />
    <Settings 
      sx={{ 
        fontSize: '0.7em', 
        position: 'absolute', 
        bottom: '-2px', 
        right: '-2px',
        backgroundColor: 'white',
        borderRadius: '50%',
        padding: '1px'
      }} 
    />
  </Box>
)

const iconMapping: Record<string, React.ReactElement> = {
  People: <PeopleAltOutlined />,
  Groups: <Groups2Outlined />,
  AdminPanelSettings: <AdminPanelSettingsOutlined />,
  Inventory: <Inventory2Outlined />,
  Mail: <MailOutlined />,
  Email: <EmailOutlined />,
  ContactMail: <ContactMailOutlined />,
  Send: <SendOutlined />,
  Shield: <AdminPanelSettingsOutlined />,
  Stars: <StarsOutlined />,
  Store: <StoreOutlined />,
  Business: <BusinessOutlined />,
  CardGiftcard: <StarsOutlined />, // Mapeamento para compatibilidade
  Settings: <Settings />,
  SettingsMail: <SettingsMailIcon />,
}

const getIcon = (iconName: string) => {
  return iconMapping[iconName] || <Inventory2Outlined />
}

type SidebarProps = {
  open: boolean
  onToggle: () => void
}

const Sidebar = ({ open, onToggle }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const withState = (base: string, closedModifier: string) =>
    open ? base : `${base} ${closedModifier}`

  // Determine App Name based on Domain
  const getAppName = () => {
    if (typeof window === 'undefined') return 'Concordia'
    const hostname = window.location.hostname
    if (hostname.includes('localhost') || hostname === '127.0.0.1') return 'Concordia'
    
    const parts = hostname.split('.')
    if (parts.length > 2) {
      const subdomain = parts[0]
      if (subdomain !== 'www' && subdomain !== 'homolog' && subdomain !== 'app') {
        return subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
      }
    }
    return 'Concordia'
  }

  const [appName] = useState(getAppName())

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configuracoesService.getFirst(getTenantSchema())
        if (config?.logo_base64) {
          setLogoBase64(config.logo_base64)
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      }
    }
    loadConfig()
  }, [])

  const { menus: allMenus } = useAuth()

  const menuStructure = useMemo(() => {
    // Processar menus hierárquicos da API v2
    const result: Array<{ title: string; items: Array<{ label: string; icon: React.ReactElement; path: string }> }> = []
    
    allMenus.forEach((menu) => {
      // Se o menu tem filhos, processar os filhos
      if (menu.children && menu.children.length > 0) {
        // Se o menu pai tem url: "#", não precisa verificar permissão do pai, apenas dos filhos
        // Se o menu pai tem URL real, verificar permissão do pai também
        const shouldCheckParentPermission = menu.url && menu.url !== '#'
        
        if (shouldCheckParentPermission) {
          // Verificar permissão do menu pai primeiro
          const hasParentPermission = permissions.some(p => p.toLowerCase() === menu.key.toLowerCase())
          if (!hasParentPermission) return
        }
        
        // Processar filhos
        const children = menu.children
          .filter(child => {
            // Verificar se o usuário tem permissão para ver este menu filho
            const hasPermission = permissions.some(p => p.toLowerCase() === child.key.toLowerCase())
            return hasPermission
          })
          .map(child => ({
            label: child.name,
            icon: getIcon(child.icon),
            path: child.url.startsWith('/') ? child.url : `/${child.url}`,
          }))

        if (children.length > 0) {
          result.push({
            title: menu.name,
            items: children,
          })
        }
      } else if (menu.url && menu.url !== '#') {
        // Menu sem filhos mas com URL - verificar permissão
        const hasPermission = permissions.some(p => p.toLowerCase() === menu.key.toLowerCase())
        if (hasPermission) {
          result.push({
            title: menu.category,
            items: [{
              label: menu.name,
              icon: getIcon(menu.icon),
              path: menu.url.startsWith('/') ? menu.url : `/${menu.url}`,
            }],
          })
        }
      }
    })

    return result
  }, [allMenus, permissions])



  const drawerContent = (
    <>
      <div className="sidebar-header">
        <Stack 
          direction={open ? "row" : "column"} 
          alignItems="center" 
          spacing={open ? 1.5 : 1} // Reduced vertical spacing when closed
          sx={{ 
            width: '100%', 
            overflow: 'visible',
            paddingLeft: open ? '4px' : '0', 
            justifyContent: open ? 'flex-start' : 'center',
            position: 'relative',
            height: 'auto',
            marginTop: open ? 0 : 1,
            marginBottom: open ? 0 : 1
          }}
        >
           {/* Logo / Icon Area - ALWAYS Visible */}
           <Box 
             className="brand-icon-container"
             onClick={() => navigate('/dashboard')}
           >
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Inventory2Outlined sx={{ color: 'white' }} />
              )}
           </Box>

           {/* Header Text Area - Visible when open */}
           {open && (
             <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <Typography variant="body1" fontWeight="800" noWrap sx={{ lineHeight: 1.1, color: '#ffffff', fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                 {appName}
               </Typography>
               <Typography variant="caption" sx={{ letterSpacing: '0.05em', color: '#ffffff', fontSize: '0.7rem', fontWeight: 600, opacity: 0.9 }}>
                 WORKSPACE
               </Typography>
             </Box>
           )}

           {/* Toggle Button - Restored per user request */}
           {!isMobile && (
             <Tooltip title={open ? "Recolher" : "Expandir"}>
               <IconButton 
                 onClick={onToggle} 
                 size="small" 
                 sx={{ 
                   color: '#ffffff',
                   margin: open ? 0 : '0 auto',
                   opacity: 0.8,
                   '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.1)' }
                 }}
               >
                  {open ? <ChevronLeft fontSize="small" /> : <ChevronRight />}
               </IconButton>
             </Tooltip>
           )}

           {/* Mobile Close Button */}
           {isMobile && open && (
             <IconButton 
               onClick={onToggle} 
               size="small" 
               className="sidebar-close"
               sx={{ color: '#ffffff' }}
             >
               <ChevronLeft />
             </IconButton>
           )}
        </Stack>
      </div>

      <nav className="sidebar-content">
        {menuStructure.length === 0 ? (
          <Box sx={{ p: 2, color: '#ffffff' }}>
            <Typography variant="body2">
              Nenhum menu disponível.
            </Typography>
          </Box>
        ) : (
          menuStructure.map((section) => (
            <div key={section.title} className="sidebar-section">
              {open && (
                <Typography 
                  variant="caption" 
                  className="sidebar-section__title" 
                  sx={{ 
                    color: '#ffffff !important',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    opacity: 1,
                    textTransform: 'uppercase',
                    mb: 1,
                    pl: 1.5
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <List disablePadding className="sidebar-list">
                {section.items.map((item) => (
                  <Tooltip key={item.label} title={!open ? item.label : ''} placement="right">
                    <ListItemButton
                      component={NavLink}
                      to={item.path}
                      className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                      onClick={() => isMobile && onToggle()}
                    >
                      <ListItemIcon className="sidebar-link__icon" sx={{ color: '#ffffff !important' }}>
                        {item.icon}
                      </ListItemIcon>
                      {open && <ListItemText primary={item.label} sx={{ color: '#ffffff !important', '& .MuiTypography-root': { fontWeight: 500 } }} />}
                    </ListItemButton>
                  </Tooltip>
                ))}
              </List>
            </div>
          ))
        )}
      </nav>

      <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}>
        <Stack direction="row" alignItems="center" justifyContent={open ? 'space-between' : 'center'}>
          {open && (
             <Typography variant="caption" sx={{ color: '#ffffff' }}>
               Tema
             </Typography>
          )}
          <ThemeSwitcher />
        </Stack>
      </Box>



    </>
  )

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onToggle}
        classes={{ paper: 'sidebar-paper sidebar-paper--mobile' }}
        PaperProps={{
          sx: {
            background: 'var(--color-sidebar-bg) !important',
            color: 'var(--color-sidebar-text) !important',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    )
  }

  return (
    <div className={withState('sidebar-container', 'sidebar-container--closed')}>
      <Drawer
        variant="permanent"
        open={open}
        className={withState('sidebar', 'sidebar--closed')}
        classes={{ paper: withState('sidebar-paper', 'sidebar-paper--closed') }}
        PaperProps={{
          sx: {
            background: 'var(--color-sidebar-bg) !important',
            color: 'var(--color-sidebar-text) !important',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </div>
  )
}

export default Sidebar

