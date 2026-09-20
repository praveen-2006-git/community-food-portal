import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
  loading = false
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon ${confirmVariant}`}>
            {isDanger ? <AlertCircle size={20} /> : <AlertTriangle size={20} />}
          </div>
          <h3 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h3>
          <button
            type="button"
            className="btn-icon"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            onClick={onCancel}
            disabled={loading}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="confirm-dialog-body">
          {message}
        </div>

        <div className="confirm-dialog-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isDanger ? 'btn-danger' : 'btn-warning'} ${loading ? 'btn-loading' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
