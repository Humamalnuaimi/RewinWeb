// SHARED COMPONENT: Card
// PURPOSE: Reusable card component for both admin and user dashboards
// LAST MODIFIED: January 28, 2025

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  style = {},
  onClick,
  hoverable = false
}) => {
  const baseStyles: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '24px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    ...style
  };

  const hoverStyles: React.CSSProperties = hoverable || onClick ? {
    ':hover': {
      background: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }
  } : {};

  return (
    <div
      className={className}
      style={baseStyles}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {title && (
        <div style={{ marginBottom: subtitle ? '8px' : '16px' }}>
          <h3 style={{
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            {title}
          </h3>
        </div>
      )}
      
      {subtitle && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            margin: 0
          }}>
            {subtitle}
          </p>
        </div>
      )}
      
      {children}
    </div>
  );
};

export default Card;
