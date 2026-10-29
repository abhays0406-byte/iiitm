import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { gsap, useGSAP, motionAllowed } from './motion';

export function Drawer({ open, onClose, title, children, width }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; width?: number }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useGSAP(() => {
    if (!open || !motionAllowed() || !panelRef.current || !overlayRef.current) return;
    gsap.from(overlayRef.current, { autoAlpha: 0, duration: 0.2, ease: 'power1.out' });
    gsap.from(panelRef.current, { x: 32, autoAlpha: 0, duration: 0.28, ease: 'power2.out' });
  }, { dependencies: [open] });

  if (!open) return null;
  return (
    <>
      <div ref={overlayRef} className="overlay" onClick={onClose} />
      <div ref={panelRef} className="drawer" role="dialog" aria-modal="true" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close drawer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}
