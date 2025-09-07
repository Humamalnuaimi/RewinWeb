/**
 * REWIN DASHBOARD THEME SYSTEM
 * Complete design system extracted from the Rewin Dashboard
 * Use this as the foundation for building consistent mobile app UI
 */

export interface RewinTheme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  shadows: Shadows;
  borderRadius: BorderRadius;
  gradients: Gradients;
  animations: Animations;
}

// ============================================================================
// COLORS - Extracted from Dashboard Design
// ============================================================================

export interface Colors {
  // Primary Brand Colors
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  
  // Background System
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    overlay: string;
  };
  
  // Text Colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    muted: string;
  };
  
  // Status Colors
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Card Accent Colors (for different card types)
  accents: {
    blue: string;
    purple: string;
    green: string;
    orange: string;
    pink: string;
    red: string;
    cyan: string;
    yellow: string;
  };
  
  // Interactive Elements
  interactive: {
    hover: string;
    active: string;
    disabled: string;
    focus: string;
  };
  
  // Border Colors
  border: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// ============================================================================
// TYPOGRAPHY - Dashboard Font System
// ============================================================================

export interface Typography {
  fontFamily: {
    primary: string;
    secondary: string;
  };
  
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

// ============================================================================
// SPACING - Consistent Spacing System
// ============================================================================

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

// ============================================================================
// SHADOWS - Card and Element Shadows
// ============================================================================

export interface Shadows {
  card: string;
  cardHover: string;
  cardActive: string;
  button: string;
  modal: string;
  dropdown: string;
}

// ============================================================================
// BORDER RADIUS - Consistent Rounded Corners
// ============================================================================

export interface BorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

// ============================================================================
// GRADIENTS - Background Gradients
// ============================================================================

export interface Gradients {
  primary: string;
  secondary: string;
  card: string;
  overlay: string;
}

// ============================================================================
// ANIMATIONS - Smooth Transitions
// ============================================================================

export interface Animations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

// ============================================================================
// THEME IMPLEMENTATION
// ============================================================================

export const rewinTheme: RewinTheme = {
  colors: {
    // Primary Brand Colors
    primary: {
      main: '#667eea',
      light: '#818cf8',
      dark: '#4f46e5',
      contrast: '#ffffff',
    },
    
    // Background System - Dark Theme with Gradients
    background: {
      primary: '#0b1021', // Main dark background
      secondary: '#151a33', // Secondary dark
      tertiary: '#0a1126', // Tertiary dark
      card: 'rgba(255, 255, 255, 0.1)', // Glass morphism card background
      overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
    },
    
    // Text Colors
    text: {
      primary: '#ffffff', // Main white text
      secondary: 'rgba(255, 255, 255, 0.8)', // Slightly transparent white
      tertiary: 'rgba(255, 255, 255, 0.6)', // More transparent white
      inverse: '#2d3748', // Dark text for light backgrounds
      muted: 'rgba(255, 255, 255, 0.4)', // Very subtle text
    },
    
    // Status Colors
    status: {
      success: '#4ade80', // Green for success states
      warning: '#fbbf24', // Yellow for warnings
      error: '#ef4444', // Red for errors
      info: '#3b82f6', // Blue for info
    },
    
    // Card Accent Colors (top border colors)
    accents: {
      blue: '#3b82f6', // Total Customers
      purple: '#8b5cf6', // Total Points
      green: '#10b981', // Total Revenue
      orange: '#f59e0b', // Check-ins Today
      pink: '#ec4899', // New Signups Today
      red: '#ef4444', // Performance Alerts
      cyan: '#06b6d4', // Rewards System
      yellow: '#eab308', // Active Outlets
    },
    
    // Interactive Elements
    interactive: {
      hover: 'rgba(255, 255, 255, 0.1)', // Hover state
      active: 'rgba(255, 255, 255, 0.2)', // Active/pressed state
      disabled: 'rgba(255, 255, 255, 0.3)', // Disabled state
      focus: '#667eea', // Focus ring color
    },
    
    // Border Colors
    border: {
      primary: 'rgba(255, 255, 255, 0.2)', // Main border color
      secondary: 'rgba(255, 255, 255, 0.1)', // Subtle borders
      accent: 'rgba(255, 255, 255, 0.3)', // Emphasized borders
    },
  },
  
  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
      secondary: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },
  
  shadows: {
    card: '0 8px 40px rgba(0, 0, 0, 0.1)',
    cardHover: '0 12px 40px rgba(0, 0, 0, 0.15)',
    cardActive: '0 4px 20px rgba(0, 0, 0, 0.2)',
    button: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    dropdown: '0 10px 25px rgba(0, 0, 0, 0.1)',
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  
  gradients: {
    primary: 'radial-gradient(1400px 900px at 18% 10%, rgba(109, 40, 217, 0.28), transparent 62%), radial-gradient(1200px 700px at 80% 15%, rgba(59, 130, 246, 0.22), transparent 60%), linear-gradient(135deg, #0b1021 0%, #151a33 40%, #0a1126 100%)',
    secondary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    card: 'rgba(255, 255, 255, 0.1)',
    overlay: 'linear-gradient(180deg, rgba(0, 0, 0, 0.0) 0%, rgba(0, 0, 0, 0.8) 100%)',
  },
  
  animations: {
    duration: {
      fast: '0.15s',
      normal: '0.3s',
      slow: '0.5s',
    },
    
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('rgba')) {
    return color.replace(/[\d\.]+\)$/g, `${opacity})`);
  }
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

/**
 * Get spacing value
 */
export const getSpacing = (size: keyof Spacing): string => {
  return rewinTheme.spacing[size];
};

/**
 * Get color value
 */
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = rewinTheme.colors;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return '#ffffff';
  }
  
  return value;
};

export default rewinTheme;

