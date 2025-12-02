import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  Switch,
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
  DarkMode,
  Logout,
  MailOutlined,
  EmailOutlined,
  ContactMailOutlined,
  SendOutlined,
} from '@mui/icons-material'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import './style.css'

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
}

const getIcon = (iconName: string) => {
  return iconMapping[iconName] || <Inventory2Outlined />
}

type SidebarProps = {
  open: boolean
  onToggle: () => void
  themeMode: 'light' | 'dark'
  onChangeTheme: (mode: 'light' | 'dark') => void
}

const Sidebar = ({ open, onToggle, themeMode, onChangeTheme }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, permissions } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const withState = (base: string, closedModifier: string) =>
    open ? base : `${base} ${closedModifier}`

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
        <Typography
          variant="h6"
          className={withState('sidebar-logo', 'sidebar-logo--compact')}
          onClick={() => navigate('/dashboard')}
          sx={{ 
            cursor: 'pointer', 
            color: 'var(--color-on-primary)',
            fontWeight: 700,
            fontSize: open ? '1.25rem' : '0.875rem',
            transition: 'all 0.3s ease',
          }}
        >
          {open ? 'Concordia ERP' : 'C'}
        </Typography>
        {isMobile && (
          <IconButton onClick={onToggle} size="small" className="sidebar-close">
            <ChevronLeft />
          </IconButton>
        )}
      </div>

      <nav className="sidebar-content">
        {menuStructure.length === 0 ? (
          <Box sx={{ p: 2, color: 'var(--color-on-primary)' }}>
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
              <Collapse in={open || isMobile} orientation="vertical">
                <Typography variant="caption" className="sidebar-section__title">
                  {section.title}
                </Typography>
              </Collapse>
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
                      color: 'var(--color-on-primary) !important',
                      '& .MuiListItemText-primary': {
                        color: 'var(--color-on-primary) !important',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'var(--color-on-primary) !important',
                      },
                    }}
                    onClick={() => isMobile && onToggle()}
                  >
                    <ListItemIcon className="sidebar-link__icon" sx={{ color: 'var(--color-on-primary) !important' }}>{item.icon}</ListItemIcon>
                    {(open || isMobile) && <ListItemText primary={item.label} sx={{ color: 'var(--color-on-primary) !important' }} />}
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
            disableRipple
            sx={{ gap: 0 }}
          >
            <ListItemIcon className="sidebar-footer__icon">
              <DarkMode fontSize="small" />
            </ListItemIcon>
            {(open || isMobile) && (
              <>
                <ListItemText
                  primary="Modo escuro"
                  className="sidebar-footer__text"
                />
                <Switch
                  size="small"
                  checked={themeMode === 'dark'}
                  onChange={(event) => onChangeTheme(event.target.checked ? 'dark' : 'light')}
                  className="sidebar-footer__switch"
                />
              </>
            )}
          </ListItemButton>
          <ListItemButton
            className="sidebar-footer__item"
            onClick={handleLogout}
            sx={{ gap: 0 }}
          >
            <ListItemIcon className="sidebar-footer__icon">
              <Logout fontSize="small" />
            </ListItemIcon>
            {(open || isMobile) && (
              <ListItemText
                primary="Sair"
                className="sidebar-footer__text"
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
            backgroundColor: 'var(--color-sidebar-bg) !important',
            color: 'var(--color-on-primary) !important',
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
            backgroundColor: 'var(--color-sidebar-bg) !important',
            color: 'var(--color-on-primary) !important',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </div>
  )
}

export default Sidebar

