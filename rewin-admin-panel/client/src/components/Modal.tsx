import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'default' | 'danger';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions, variant = 'default' }) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    const baseStyles = {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 245, 255, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      boxShadow: '0 25px 50px -12px rgba(102, 126, 234, 0.25)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'hidden',
      position: 'relative' as const,
      transform: 'scale(1)',
      opacity: 1,
      transition: 'all 0.3s ease-out'
    };

    if (variant === 'danger') {
      return {
        ...baseStyles,
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)'
      };
    }

    return baseStyles;
  };

  const getHeaderStyles = () => {
    const baseStyles = {
      padding: '24px 24px 0 24px',
      borderBottom: variant === 'danger' ? '1px solid rgba(239, 68, 68, 0.1)' : '1px solid rgba(102, 126, 234, 0.1)',
      marginBottom: '20px'
    };

    return baseStyles;
  };

  const getTitleStyles = () => {
    const baseStyles = {
      fontSize: '24px',
      fontWeight: '700',
      margin: '0 0 8px 0',
      color: variant === 'danger' ? '#dc2626' : '#1f2937'
    };

    return baseStyles;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      opacity: 1,
      transition: 'opacity 0.3s ease-out'
    }}>
      <div style={getModalStyles()}>
        {/* Header */}
        <div style={getHeaderStyles()}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(102, 126, 234, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#667eea'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
              e.currentTarget.style.color = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.color = '#667eea';
            }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
          
          {title && (
            <div>
              <h2 style={getTitleStyles()}>{title}</h2>
              {variant === 'danger' && (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  This action cannot be undone
                </p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{
          padding: '0 24px 24px 24px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div style={{
            padding: '20px 24px 24px 24px',
            borderTop: '1px solid rgba(102, 126, 234, 0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal; 