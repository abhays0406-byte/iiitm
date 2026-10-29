import React, { useRef } from 'react';
import { Icon } from './Icon';
import { gsap, useGSAP, motionAllowed } from './motion';

interface ToastProps {
  open: boolean;
  message: string;
  onClose?: () => void;
  onUndo?: () => void;
  onDismiss?: () => void;
  /** Floating toasts pin themselves to the bottom of the screen; stacked ones sit in a parent container. */
  floating?: boolean;
}

export function Toast({ open, message, onClose, onUndo, onDismiss, floating = true }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!open || !ref.current || !motionAllowed()) return;
    gsap.from(ref.current, floating
      ? { y: 10, autoAlpha: 0, duration: 0.25, ease: 'power2.out' }
      : { x: 16, autoAlpha: 0, duration: 0.25, ease: 'power2.out' });
  }, { dependencies: [open, message] });

  if (!open) return null;
  const handleClose = onDismiss ?? onClose ?? (() => {});
  return (
    <div ref={ref} role="status" className={`toast${floating ? ' toast-floating' : ''}`}>
      <Icon name="checkCircle" size={16} className="toast-icon" />
      <span className="toast-msg">{message}</span>
      {onUndo && (
        <button type="button" className="toast-undo" onClick={onUndo}>Undo</button>
      )}
      <button type="button" className="icon-btn" onClick={handleClose} aria-label="Dismiss">
        <Icon name="x" size={14} />
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
