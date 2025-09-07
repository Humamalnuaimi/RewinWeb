// Rewin Admin Panel V2 - Theme Variables
// Following AdminPanelTheme.md specifications exactly

export const theme = {
  // Primary Colors
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    background: `radial-gradient(1200px 800px at 18% 10%, rgba(120,140,255,0.45), transparent 60%),
                 radial-gradient(1100px 700px at 80% 25%, rgba(150,110,220,0.40), transparent 60%),
                 linear-gradient(135deg, #0c1020 0%, #161a33 100%)`,
    text: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)'
  },

  // Background Colors
  backgrounds: {
    main: 'radial-gradient(1200px 800px at 18% 10%, rgba(120,140,255,0.45), transparent 60%), radial-gradient(1100px 700px at 80% 25%, rgba(150,110,220,0.40), transparent 60%), linear-gradient(135deg, #0c1020 0%, #161a33 100%)',
    card: 'rgba(255, 255, 255, 0.05)',
    cardHover: 'rgba(255, 255, 255, 0.1)',
    sidebar: 'rgba(255, 255, 255, 0.1)',
    modal: 'rgba(255, 255, 255, 0.1)',
    input: 'rgba(255, 255, 255, 0.05)'
  },

  // Text Colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.6)',
    placeholder: 'rgba(255, 255, 255, 0.6)'
  },

  // Status Colors
  status: {
    success: '#10b981',
    successBg: 'rgba(34, 197, 94, 0.1)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.1)'
  },

  // Activity Type Colors
  activity: {
    user: 'rgba(59, 130, 246, 0.1)',
    outlet: 'rgba(139, 92, 246, 0.1)',
    revenue: 'rgba(34, 197, 94, 0.1)',
    customer: 'rgba(245, 158, 11, 0.1)',
    default: 'rgba(107, 114, 128, 0.1)'
  },

  // Border Colors
  borders: {
    primary: 'rgba(255, 255, 255, 0.2)',
    secondary: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(139, 92, 246, 0.5)'
  },

  // Typography
  fonts: {
    family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`,
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem'
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    }
  },

  // Spacing Scale
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },

  // Border Radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px'
  },

  // Shadows
  shadows: {
    sm: '0 4px 15px rgba(102, 126, 234, 0.3)',
    md: '0 6px 20px rgba(102, 126, 234, 0.4)',
    lg: '0 10px 30px rgba(102, 126, 234, 0.2)',
    xl: '0 20px 60px rgba(0, 0, 0, 0.4)'
  },

  // Transitions
  transitions: {
    fast: 'all 0.2s ease',
    normal: 'all 0.3s ease',
    slow: 'all 0.5s ease'
  },

  // Layout
  layout: {
    sidebarWidth: '280px',
    maxWidth: '1200px'
  }
} as const;

// Icon mappings from DEVELOPMENT_RULES.md
export const NAVIGATION_ICONS = {
  dashboard: 'BarChart3',
  users: 'Users',
  outlets: 'Store',
  customers: 'User',
  transactions: 'CreditCard',
  analytics: 'TrendingUp',
  email: 'Mail',
  system: 'Settings',
  logout: 'LogOut'
} as const;

export const ACTION_ICONS = {
  create: 'Plus',
  edit: 'Edit',
  delete: 'Trash2',
  view: 'Eye',
  search: 'Search',
  filter: 'Filter',
  export: 'Download',
  import: 'Upload',
  refresh: 'RefreshCw',
  save: 'Save',
  cancel: 'X',
  back: 'ArrowLeft',
  forward: 'ArrowRight',
  send: 'Send',
  copy: 'Copy',
  settings: 'Settings',
  google: 'Mail'
} as const;

export const STATUS_ICONS = {
  success: 'CheckCircle',
  error: 'XCircle',
  warning: 'AlertTriangle',
  info: 'Info',
  loading: 'Loader',
  pending: 'Clock',
  active: 'CheckCircle2',
  inactive: 'XCircle'
} as const;
