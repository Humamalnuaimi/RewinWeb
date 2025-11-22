import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, confirmText = 'Confirm', cancelText = 'Close', tone = 'warning', loading, onConfirm, onClose }) => {
  if (!open) return null;
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <div className="confirm-head">
          <h4 className="confirm-title">{title}</h4>
          {message && <p className="confirm-msg">{message}</p>}
        </div>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-warning'}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
