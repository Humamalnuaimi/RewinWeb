/**
 * REWIN DASHBOARD COMPONENTS
 * Complete component library matching the Rewin Dashboard design
 * Ready for mobile app implementation
 */

import React, { ReactNode, CSSProperties } from 'react';
import { rewinTheme, withOpacity } from './RewinThemeSystem';

// ============================================================================
// ICON COMPONENTS - SVG Icons from Dashboard
// ============================================================================

export const RewinIcons = {
  // Analytics & Dashboard Icons
  Analytics: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3v18h18v-2H5V3H3zm16 4V5l-4 2-4-2-4 2v12l4-2 4 2 4-2z"/>
    </svg>
  ),
  
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.98 2.98 0 0 0 17.14 7H16.5c-.8 0-1.54.37-2.01.99l-.49.71c-.81 1.17-2.13 1.98-3.61 2.23-.22-.91-.78-1.68-1.56-2.15A2.99 2.99 0 0 0 7 7H6.86c-1.31 0-2.43.83-2.82 2.02L1.5 16H4v6h2v-6h1.5l2-6H11v6h2v-6h1.5l2 6H18v6h2z"/>
    </svg>
  ),
  
  Store: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
    </svg>
  ),
  
  Revenue: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
    </svg>
  ),
  
  Signup: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  
  // Additional useful icons
  CheckIn: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  
  Points: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  
  Rewards: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  
  Settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
    </svg>
  ),
  
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  ),
  
  Close: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  ),
  
  ArrowRight: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
    </svg>
  ),
};

// ============================================================================
// DASHBOARD CARD COMPONENT
// ============================================================================

export interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  accentColor: keyof typeof rewinTheme.colors.accents;
  onClick?: () => void;
  loading?: boolean;
  style?: CSSProperties;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  onClick,
  loading = false,
  style = {},
}) => {
  const cardStyle: CSSProperties = {
    background: rewinTheme.colors.background.card,
    padding: rewinTheme.spacing.lg,
    borderRadius: rewinTheme.borderRadius.xl,
    border: `1px solid ${rewinTheme.colors.border.primary}`,
    borderTop: `4px solid ${rewinTheme.colors.accents[accentColor]}`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: rewinTheme.shadows.card,
    cursor: onClick ? 'pointer' : 'default',
    transition: `all ${rewinTheme.animations.duration.normal} ${rewinTheme.animations.easing.easeInOut}`,
    transform: 'translateY(0)',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      const card = e.currentTarget;
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = `${rewinTheme.shadows.cardHover}, 0 0 40px ${withOpacity(rewinTheme.colors.accents[accentColor], 0.3)}`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      const card = e.currentTarget;
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = rewinTheme.shadows.card;
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: rewinTheme.spacing.md,
        marginBottom: rewinTheme.spacing.lg,
      }}>
        {icon && (
          <div style={{
            width: '40px',
            height: '40px',
            background: rewinTheme.colors.accents[accentColor],
            borderRadius: rewinTheme.borderRadius.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: rewinTheme.colors.text.primary,
          }}>
            {icon}
          </div>
        )}
        <h3 style={{
          color: rewinTheme.colors.text.primary,
          margin: 0,
          fontSize: rewinTheme.typography.fontSize.xl,
          fontWeight: rewinTheme.typography.fontWeight.semibold,
        }}>
          {title}
        </h3>
      </div>

      {/* Value */}
      <div style={{
        fontSize: rewinTheme.typography.fontSize['4xl'],
        fontWeight: rewinTheme.typography.fontWeight.bold,
        color: rewinTheme.colors.text.primary,
        marginBottom: rewinTheme.spacing.sm,
        lineHeight: rewinTheme.typography.lineHeight.tight,
      }}>
        {loading ? (
          <div style={{
            width: '60px',
            height: '40px',
            background: rewinTheme.colors.interactive.disabled,
            borderRadius: rewinTheme.borderRadius.sm,
            animation: 'pulse 2s infinite',
          }} />
        ) : (
          value
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          color: rewinTheme.colors.text.secondary,
          fontSize: rewinTheme.typography.fontSize.sm,
          display: 'flex',
          alignItems: 'center',
          gap: rewinTheme.spacing.xs,
        }}>
          {subtitle}
          {onClick && <RewinIcons.ArrowRight />}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

export interface HeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  onSignOut?: () => void;
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  userEmail,
  onSignOut,
  onMenuClick,
  showMenu = false,
}) => {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${rewinTheme.spacing.lg} ${rewinTheme.spacing.xl}`,
      background: rewinTheme.colors.background.card,
      borderBottom: `1px solid ${rewinTheme.colors.border.primary}`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Left Side - Logo and Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: rewinTheme.spacing.md }}>
        {showMenu && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: rewinTheme.colors.text.primary,
              cursor: 'pointer',
              padding: rewinTheme.spacing.sm,
              borderRadius: rewinTheme.borderRadius.sm,
              transition: `background ${rewinTheme.animations.duration.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = rewinTheme.colors.interactive.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <RewinIcons.Menu />
          </button>
        )}
        
        <div style={{
          width: '48px',
          height: '48px',
          background: rewinTheme.colors.primary.main,
          borderRadius: rewinTheme.borderRadius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: rewinTheme.colors.text.primary,
          fontSize: rewinTheme.typography.fontSize.xl,
          fontWeight: rewinTheme.typography.fontWeight.bold,
        }}>
          R
        </div>
        
        <div>
          <h1 style={{
            color: rewinTheme.colors.text.primary,
            fontSize: rewinTheme.typography.fontSize['2xl'],
            fontWeight: rewinTheme.typography.fontWeight.bold,
            margin: 0,
            lineHeight: rewinTheme.typography.lineHeight.tight,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              color: rewinTheme.colors.text.secondary,
              fontSize: rewinTheme.typography.fontSize.sm,
              margin: 0,
              lineHeight: rewinTheme.typography.lineHeight.normal,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side - User Info and Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: rewinTheme.spacing.md }}>
        {userEmail && (
          <div style={{ textAlign: 'right' }}>
            <p style={{
              color: rewinTheme.colors.text.secondary,
              fontSize: rewinTheme.typography.fontSize.sm,
              margin: 0,
            }}>
              Welcome back,
            </p>
            <p style={{
              color: rewinTheme.colors.text.primary,
              fontSize: rewinTheme.typography.fontSize.base,
              fontWeight: rewinTheme.typography.fontWeight.medium,
              margin: 0,
            }}>
              {userEmail}
            </p>
          </div>
        )}
        
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              background: rewinTheme.colors.interactive.hover,
              border: `1px solid ${rewinTheme.colors.border.primary}`,
              color: rewinTheme.colors.text.primary,
              padding: `${rewinTheme.spacing.sm} ${rewinTheme.spacing.md}`,
              borderRadius: rewinTheme.borderRadius.md,
              fontSize: rewinTheme.typography.fontSize.sm,
              fontWeight: rewinTheme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: `all ${rewinTheme.animations.duration.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = rewinTheme.colors.interactive.active;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = rewinTheme.colors.interactive.hover;
            }}
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
};

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon,
  style = {},
}) => {
  const getVariantStyles = (): CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: rewinTheme.colors.primary.main,
          color: rewinTheme.colors.primary.contrast,
          border: `1px solid ${rewinTheme.colors.primary.main}`,
        };
      case 'secondary':
        return {
          background: rewinTheme.colors.background.card,
          color: rewinTheme.colors.text.primary,
          border: `1px solid ${rewinTheme.colors.border.primary}`,
        };
      case 'outline':
        return {
          background: 'transparent',
          color: rewinTheme.colors.text.primary,
          border: `1px solid ${rewinTheme.colors.border.accent}`,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: rewinTheme.colors.text.primary,
          border: '1px solid transparent',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: `${rewinTheme.spacing.sm} ${rewinTheme.spacing.md}`,
          fontSize: rewinTheme.typography.fontSize.sm,
        };
      case 'md':
        return {
          padding: `${rewinTheme.spacing.md} ${rewinTheme.spacing.lg}`,
          fontSize: rewinTheme.typography.fontSize.base,
        };
      case 'lg':
        return {
          padding: `${rewinTheme.spacing.lg} ${rewinTheme.spacing.xl}`,
          fontSize: rewinTheme.typography.fontSize.lg,
        };
      default:
        return {};
    }
  };

  const buttonStyle: CSSProperties = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    borderRadius: rewinTheme.borderRadius.md,
    fontWeight: rewinTheme.typography.fontWeight.medium,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: `all ${rewinTheme.animations.duration.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rewinTheme.spacing.sm,
    opacity: disabled || loading ? 0.6 : 1,
    ...style,
  };

  return (
    <button
      style={buttonStyle}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled || loading}
    >
      {loading ? (
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid currentColor',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      ) : (
        <>
          {icon && icon}
          {children}
        </>
      )}
    </button>
  );
};

// ============================================================================
// INPUT COMPONENT
// ============================================================================

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  icon?: ReactNode;
  style?: CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  label,
  icon,
  style = {},
}) => {
  const inputStyle: CSSProperties = {
    width: '100%',
    padding: rewinTheme.spacing.md,
    paddingLeft: icon ? '3rem' : rewinTheme.spacing.md,
    border: `2px solid ${error ? rewinTheme.colors.status.error : rewinTheme.colors.border.primary}`,
    borderRadius: rewinTheme.borderRadius.md,
    fontSize: rewinTheme.typography.fontSize.base,
    background: rewinTheme.colors.background.card,
    color: rewinTheme.colors.text.primary,
    transition: `border-color ${rewinTheme.animations.duration.fast}`,
    outline: 'none',
    ...style,
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: rewinTheme.spacing.sm,
          fontWeight: rewinTheme.typography.fontWeight.semibold,
          color: rewinTheme.colors.text.primary,
          fontSize: rewinTheme.typography.fontSize.sm,
        }}>
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: rewinTheme.spacing.md,
            top: '50%',
            transform: 'translateY(-50%)',
            color: rewinTheme.colors.text.secondary,
            pointerEvents: 'none',
          }}>
            {icon}
          </div>
        )}
        
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          style={inputStyle}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = rewinTheme.colors.primary.main;
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = rewinTheme.colors.border.primary;
            }
          }}
        />
      </div>
      
      {error && (
        <p style={{
          color: rewinTheme.colors.status.error,
          fontSize: rewinTheme.typography.fontSize.sm,
          marginTop: rewinTheme.spacing.xs,
          margin: 0,
        }}>
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = rewinTheme.colors.primary.main,
}) => {
  const getSize = () => {
    switch (size) {
      case 'sm': return '16px';
      case 'md': return '24px';
      case 'lg': return '32px';
      default: return '24px';
    }
  };

  return (
    <div
      style={{
        width: getSize(),
        height: getSize(),
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
};

// ============================================================================
// MODAL COMPONENT
// ============================================================================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: rewinTheme.colors.background.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: rewinTheme.spacing.lg,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: rewinTheme.colors.background.secondary,
          borderRadius: rewinTheme.borderRadius.xl,
          border: `1px solid ${rewinTheme.colors.border.primary}`,
          boxShadow: rewinTheme.shadows.modal,
          maxWidth,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{
            padding: rewinTheme.spacing.lg,
            borderBottom: `1px solid ${rewinTheme.colors.border.primary}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{
              color: rewinTheme.colors.text.primary,
              fontSize: rewinTheme.typography.fontSize.xl,
              fontWeight: rewinTheme.typography.fontWeight.semibold,
              margin: 0,
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: rewinTheme.colors.text.secondary,
                cursor: 'pointer',
                padding: rewinTheme.spacing.sm,
                borderRadius: rewinTheme.borderRadius.sm,
                transition: `background ${rewinTheme.animations.duration.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = rewinTheme.colors.interactive.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <RewinIcons.Close />
            </button>
          </div>
        )}
        
        <div style={{ padding: rewinTheme.spacing.lg }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// GLOBAL STYLES (for animations)
// ============================================================================

export const GlobalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
`;

export default {
  DashboardCard,
  Header,
  Button,
  Input,
  LoadingSpinner,
  Modal,
  RewinIcons,
  GlobalStyles,
};

