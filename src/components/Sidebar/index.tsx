import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  Box,
} from '@mui/material'
import {
  Inventory2Outlined,
  PeopleAltOutlined,
  AdminPanelSettingsOutlined,
  Groups2Outlined,
  ChevronLeft,
  Logout,
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
  const { logout, permissions } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const withState = (base: string, closedModifier: string) =>
    open ? base : `${base} ${closedModifier}`

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

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (error) {
      // Se houver erro, ainda assim redireciona para login
      console.error('Erro ao fazer logout:', error)
      navigate('/', { replace: true })
    }
  }

  const drawerContent = (
    <>
      <div className="sidebar-header">
        {logoBase64 ? (
          <Box
            onClick={() => navigate('/dashboard')}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: open ? 'flex-start' : 'center',
              width: '100%',
              height: open ? '48px' : '40px',
              transition: 'all 0.3s ease',
            }}
          >
            <img
              src={logoBase64}
              alt="Logo"
              style={{
                maxHeight: open ? '48px' : '32px',
                maxWidth: open ? '100%' : '32px',
                objectFit: 'contain',
              }}
            />
          </Box>
        ) : null}
        {isMobile && (
          <IconButton 
            onClick={onToggle} 
            size="small" 
            className="sidebar-close"
            sx={{ color: '#335599 !important' }}
          >
            <ChevronLeft />
          </IconButton>
        )}
      </div>

      <nav className="sidebar-content">
        {menuStructure.length === 0 ? (
          <Box sx={{ p: 2, color: '#335599' }}>
            <Typography variant="body2">
              Nenhum menu disponível. Verifique suas permissões.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
              Menus: {allMenus.length} | Permissões: {permissions.length}
            </Typography>
          </Box>
        ) : (
          menuStructure.map((section) => (
            <div key={section.title} className="sidebar-section">
              {(open || isMobile) && (
                <Typography 
                  variant="caption" 
                  className="sidebar-section__title" 
                  style={{
                    color: '#335599',
                    opacity: 1,
                  }}
                  sx={{ 
                    color: '#335599 !important',
                    opacity: '1 !important',
                    '&.MuiTypography-root': {
                      color: '#335599 !important',
                    },
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <List disablePadding>
                {section.items.map((item) => (
                  <ListItemButton
                    key={item.label}
                    component={NavLink}
                    to={item.path}
                    className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''
                      }`}
                    sx={{ 
                      gap: 0,
                      color: '#335599 !important',
                      '& .MuiListItemText-primary': {
                        color: '#335599 !important',
                      },
                      '& .MuiListItemIcon-root': {
                        color: '#335599 !important',
                        minWidth: open ? 28 : 24,
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#335599 !important',
                      },
                      '&:hover .MuiListItemIcon-root': {
                        color: '#335599 !important',
                      },
                      '&:hover .MuiSvgIcon-root': {
                        color: '#335599 !important',
                      },
                      '&.active .MuiListItemIcon-root': {
                        color: '#335599 !important',
                      },
                      '&.active .MuiSvgIcon-root': {
                        color: '#335599 !important',
                      },
                      justifyContent: open ? 'flex-start' : 'center',
                    }}
                    onClick={() => isMobile && onToggle()}
                    title={!open ? item.label : ''}
                  >
                    <ListItemIcon 
                      className="sidebar-link__icon" 
                      sx={{ 
                        color: '#335599 !important',
                        '& .MuiSvgIcon-root': {
                          color: '#335599 !important',
                        },
                        '& svg': {
                          color: '#335599 !important',
                          fill: '#335599 !important',
                        },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {(open || isMobile) && <ListItemText primary={item.label} sx={{ color: '#335599 !important' }} />}
                  </ListItemButton>
                ))}
              </List>
            </div>
          ))
        )}
      </nav>

      <div className="sidebar-footer">
        <Divider className="sidebar-footer__divider" />
        <Stack spacing={1} className="sidebar-footer__content">
          <ListItemButton
            className="sidebar-footer__item"
            onClick={handleLogout}
            sx={{ 
              gap: 0,
              color: '#335599 !important',
              '& .MuiListItemText-primary': {
                color: '#335599 !important',
              },
              '& .MuiListItemIcon-root': {
                color: '#335599 !important',
              },
            }}
            title={!open && !isMobile ? 'Sair' : ''}
          >
            <ListItemIcon className="sidebar-footer__icon" sx={{ color: '#335599 !important' }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            {(open || isMobile) && (
              <ListItemText
                primary="Sair"
                className="sidebar-footer__text"
                sx={{ color: '#335599 !important' }}
              />
            )}
          </ListItemButton>
        </Stack>
      </div>
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
            backgroundColor: '#ffffff !important',
            color: '#335599 !important',
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
            backgroundColor: '#ffffff !important',
            color: '#335599 !important',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </div>
  )
}

export default Sidebar

