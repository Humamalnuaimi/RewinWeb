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
        data-glass-modal
        style={{
          width: 'min(760px, 95vw)', maxHeight: '90vh', overflowY: 'auto', position: 'relative',
          borderRadius: 24, padding: '2rem',
          background: 'rgba(16,24,40,0.55)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          color: 'white'
        }}
      >
        {/* Scoped dark styles for inputs inside modal */}
        <style>{`
          [data-glass-modal] label { color: rgba(255,255,255,0.95) !important; }
          [data-glass-modal] input,
          [data-glass-modal] select,
          [data-glass-modal] textarea {
            background: rgba(255,255,255,0.08) !important;
            border: 1px solid rgba(255,255,255,0.22) !important;
            color: #fff !important;
            box-shadow: none !important;
          }
          [data-glass-modal] input::placeholder,
          [data-glass-modal] textarea::placeholder { color: rgba(255,255,255,0.7); }
          [data-glass-modal] select option { background: #0b1021; color: #fff; }
          [data-glass-modal] input:focus,
          [data-glass-modal] select:focus,
          [data-glass-modal] textarea:focus {
            outline: none !important;
            border-color: rgba(99,102,241,0.6) !important;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.25) !important;
          }

          /* Utility field classes for modal forms */
          [data-glass-modal] .field-block { margin-bottom: 2rem; }
          [data-glass-modal] .field-block-lg { margin-bottom: 3rem; }
          [data-glass-modal] .field-label { display:block; margin: 0 0 0.6rem 0; font-weight: 600; font-size: 1.05rem; }
          [data-glass-modal] .field-hint { margin: 0.4rem 0 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.7); }

          /* Compact, themed native select (fallback) */
          [data-glass-modal] .select-compact {
            width: 100%;
            padding: 0.5rem 0.75rem;
            height: 40px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.22);
            background: rgba(255,255,255,0.08);
            color: #fff;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            line-height: 1.2;
          }

          /* Custom ThemedSelect */
          [data-glass-modal] .select-control { position: relative; }
          [data-glass-modal] .select-control.open .select-display { border-color: rgba(99,102,241,0.6); box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }
          [data-glass-modal] .select-display { width:100%; height:40px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 0.75rem; border-radius:12px; border:1px solid rgba(255,255,255,0.22); background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }
          [data-glass-modal] .select-display:disabled { opacity:.6; cursor:not-allowed; }
          [data-glass-modal] .select-caret { opacity:.9 }
          [data-glass-modal] .select-menu { position:absolute; left:0; right:0; top:calc(100% + 8px); background:rgba(11,16,33,0.98); border:1px solid rgba(255,255,255,0.18); border-radius:12px; box-shadow:0 18px 40px rgba(0,0,0,0.45); padding:6px; max-height:260px; overflow:auto; z-index:50; }
          [data-glass-modal] .select-option { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border-radius:10px; color:#fff; cursor:pointer; font-weight:600; }
          [data-glass-modal] .select-option:hover, [data-glass-modal] .select-option.highlighted { background:rgba(255,255,255,0.08); }
          [data-glass-modal] .select-option.selected { background:linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.25)); border:1px solid rgba(99,102,241,0.35); }

          /* Centered toggle group */
          [data-glass-modal] .toggle-centered { margin-bottom: 1rem; display:flex; flex-direction: column; align-items: center; }
          [data-glass-modal] .toggle-row { display: inline-flex; gap: 0.5rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 0.25rem; }
          [data-glass-modal] .toggle-btn { padding: 0.5rem 0.9rem; border-radius: 10px; background: transparent; color: white; border: none; cursor: pointer; font-weight: 700; }
          [data-glass-modal] .toggle-btn.active-dollar { background: linear-gradient(135deg, #10b981, #059669); }
          [data-glass-modal] .toggle-btn.active-percent { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, background: accentMap[accent], WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: '0.4rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>{subtitle}</p>
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
