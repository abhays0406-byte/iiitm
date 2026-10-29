import React from 'react';

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  neutral: { borderColor: 'var(--border)', color: 'var(--ink-3)' },
  accent: { borderColor: 'var(--accent)', color: 'var(--accent)' },
  hold: { borderColor: 'var(--hold)', color: 'var(--hold)' },
  high: { borderColor: 'var(--high)', color: 'var(--high)' },
};

export function Chip({ variant = 'neutral', children, style }: { variant?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 4, padding: '2px 8px', border: '1px solid', fontSize: 11, fontWeight: 500, ...VARIANT_STYLES[variant], ...style }}>
      {children}
    </span>
  );
}
