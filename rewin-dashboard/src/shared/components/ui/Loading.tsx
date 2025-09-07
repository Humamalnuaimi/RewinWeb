// SHARED COMPONENT: Loading
// PURPOSE: Reusable loading spinner component for both admin and user dashboards
// LAST MODIFIED: January 28, 2025

import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  color = 'white',
  text,
  fullScreen = false
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: '24px', height: '24px' };
      case 'medium':
        return { width: '40px', height: '40px' };
      case 'large':
        return { width: '60px', height: '60px' };
      default:
        return { width: '40px', height: '40px' };
    }
  };

  const containerStyles: React.CSSProperties = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  };

  const spinnerStyles: React.CSSProperties = {
    ...getSizeStyles(),
    border: `4px solid rgba(255, 255, 255, 0.3)`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  // Add CSS animation if not already present
  React.useEffect(() => {
    const styleId = 'loading-spinner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={containerStyles}>
      <div style={spinnerStyles} />
      {text && (
        <p style={{
          color: color,
          marginTop: '16px',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;
