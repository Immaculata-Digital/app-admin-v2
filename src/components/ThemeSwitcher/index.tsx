import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import { LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material'
import { useState, type MouseEvent } from 'react'
import { useTheme } from '../../context/ThemeContext'

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    handleClose()
  }

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <DarkMode />
      case 'light':
        return <LightMode />
      case 'system':
        return <SettingsBrightness />
    }
  }

  const getTooltip = () => {
    switch (theme) {
      case 'dark':
        return 'Tema Escuro'
      case 'light':
        return 'Tema Claro'
      case 'system':
        return 'Tema do Sistema'
    }
  }

  return (
    <>
      <Tooltip title={`Alternar tema (${getTooltip()})`}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2, color: 'inherit' }}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          {getIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="theme-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleThemeChange('light')} selected={theme === 'light'}>
          <ListItemIcon>
            <LightMode fontSize="small" />
          </ListItemIcon>
          <ListItemText>Claro</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('dark')} selected={theme === 'dark'}>
          <ListItemIcon>
            <DarkMode fontSize="small" />
          </ListItemIcon>
          <ListItemText>Escuro</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('system')} selected={theme === 'system'}>
          <ListItemIcon>
            <SettingsBrightness fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sistema</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
