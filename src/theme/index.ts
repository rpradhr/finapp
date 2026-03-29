import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      light: '#4da3ff',
      dark: '#0d47a1',
    },
    secondary: {
      main: '#34a853',
      light: '#66bb6a',
      dark: '#1b5e20',
    },
    error: {
      main: '#ea4335',
    },
    warning: {
      main: '#fbbc04',
    },
    success: {
      main: '#34a853',
    },
    info: {
      main: '#4285f4',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#e8eaed',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    overline: {
      fontWeight: 600,
      letterSpacing: '0.08em',
      fontSize: '0.7rem',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          transition: 'box-shadow 0.2s ease, transform 0.15s ease',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none' as const,
          fontWeight: 500,
          padding: '8px 24px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: 'transparent',
          borderBottom: '2px solid #e8eaed',
          color: '#5f6368',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
        },
        root: {
          borderBottom: '1px solid #f1f3f4',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none' as const,
          fontWeight: 500,
          padding: '6px 20px',
        },
      },
    },
  },
});

export const CHART_COLORS = [
  '#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#8e24aa',
  '#e91e63', '#00acc1', '#ff7043', '#5c6bc0', '#26a69a',
  '#d81b60', '#43a047', '#ffb300', '#1e88e5', '#6d4c41',
];

export const SEVERITY_COLORS = {
  info: { bg: '#e8f0fe', border: '#1a73e8', text: '#174ea6', icon: '#1a73e8' },
  success: { bg: '#e6f4ea', border: '#34a853', text: '#137333', icon: '#34a853' },
  warning: { bg: '#fef7e0', border: '#fbbc04', text: '#b06000', icon: '#f9ab00' },
  error: { bg: '#fce8e6', border: '#ea4335', text: '#c5221f', icon: '#ea4335' },
};

export function getCategoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export const CUSTOM_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 12,
    border: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    padding: '12px 16px',
    fontSize: 13,
  },
};
