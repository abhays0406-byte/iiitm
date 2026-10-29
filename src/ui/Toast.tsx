import React from 'react';

interface ToastProps {
  open: boolean;
  message: string;
  onClose?: () => void;
  onUndo?: () => void;
  onDismiss?: () => void;
}

export function Toast({ open, message, onClose, onUndo, onDismiss }: ToastProps) {
  if (!open) return null;
  const handleClose = onDismiss ?? onClose ?? (() => {});
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', padding: '10px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
      <span style={{ fontSize: 13 }}>{message}</span>
      {onUndo && (
        <button type="button" onClick={onUndo} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Undo
        </button>
      )}
      <button type="button" onClick={handleClose} aria-label="Dismiss"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState<{ id: string; message: string }[]>([]);
  const show = (message: string, ms = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  };
  return { toasts, show };
}
