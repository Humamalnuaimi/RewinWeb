import React from 'react';

interface GlassModalProps {
  title: string;
  subtitle?: string;
  accent?: 'blue' | 'green' | 'purple' | 'orange';
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const accentMap: Record<NonNullable<GlassModalProps['accent']>, string> = {
  blue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  green: 'linear-gradient(135deg, #10b981, #059669)',
  purple: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  orange: 'linear-gradient(135deg, #f59e0b, #d97706)'
};

const GlassModal: React.FC<GlassModalProps> = ({ title, subtitle, accent = 'blue', onClose, children, footer }) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', zIndex: 1000
      }}
      role="dialog" aria-modal="true"
    >
      <div
        style={{
          width: 'min(760px, 95vw)', maxHeight: '90vh', overflowY: 'auto', position: 'relative',
          borderRadius: 24, padding: '2rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, background: accentMap[accent], WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: '0.4rem 0 0 0', opacity: 0.85, fontSize: '0.95rem' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', fontSize: 18,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.9)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0.5rem 0 0 0' }}>{children}</div>

        {footer && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassModal;
