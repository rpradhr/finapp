import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, useMediaQuery, useTheme, AppBar, Toolbar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Receipt as ReceiptIcon,
  CloudUpload as UploadIcon,
  SmartToy as AssistantIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  TableChart as SpreadsheetIcon,
  Email as EmailIcon,
  ShoppingCart as AmazonIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

interface NavGroup {
  label: string;
  items: { text: string; icon: React.ReactNode; path: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ANALYTICS',
    items: [
      { text: 'Overview', icon: <DashboardIcon />, path: '/overview' },
      { text: 'Trends', icon: <TrendingUpIcon />, path: '/trends' },
      { text: 'Categories', icon: <CategoryIcon />, path: '/categories' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { text: 'Transactions', icon: <ReceiptIcon />, path: '/transactions' },
      { text: 'Spreadsheet', icon: <SpreadsheetIcon />, path: '/spreadsheet' },
      { text: 'Import', icon: <UploadIcon />, path: '/import' },
      { text: 'Gmail Import', icon: <EmailIcon />, path: '/gmail' },
      { text: 'Amazon Orders', icon: <AmazonIcon />, path: '/amazon' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { text: 'AI Assistant', icon: <AssistantIcon />, path: '/assistant' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const currentPage = ALL_ITEMS.find(
    item => location.pathname === item.path || (item.path === '/overview' && location.pathname === '/')
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Area */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
          px: 3,
          py: 3.5,
          mb: 1,
        }}
      >
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, letterSpacing: '-0.02em' }}>
          FinApp
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, display: 'block' }}>
          Family Expenses
        </Typography>
      </Box>

      {/* Navigation Groups */}
      <Box sx={{ flex: 1, px: 1.5, py: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.label} sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#5f6368',
                px: 1.5,
                mb: 0.5,
                display: 'block',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const isSelected = location.pathname === item.path ||
                  (item.path === '/overview' && location.pathname === '/');
                return (
                  <ListItemButton
                    key={item.text}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: '24px',
                      mx: 0.5,
                      mb: 0.3,
                      py: 1,
                      px: 2,
                      backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
                      color: isSelected ? '#1a73e8' : '#3c4043',
                      '&:hover': {
                        backgroundColor: isSelected ? '#d2e3fc' : '#f1f3f4',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isSelected ? '#1a73e8' : '#5f6368',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e8eaed',
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#202124' }}>
              {currentPage?.text || 'FinApp'}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: 0 }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                borderRight: 'none',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                borderRight: 'none',
                boxShadow: '1px 0 4px rgba(0,0,0,0.03)',
                backgroundColor: 'white',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 4 },
          mt: isMobile ? '64px' : 0,
          maxWidth: '100%',
          overflow: 'auto',
        }}
      >
        {/* Page Header */}
        {!isMobile && currentPage && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#202124', fontWeight: 700 }}>
              {currentPage.text}
            </Typography>
          </Box>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}
