import React from 'react';
import { Icon } from './Icon';

type Variant = 'info' | 'warn';

export function Banner({ variant = 'info', children }: { variant?: Variant; children: React.ReactNode }) {
  const style: React.CSSProperties = variant === 'warn'
    ? { borderColor: 'var(--hold)', background: 'rgba(232,160,0,0.12)', color: 'var(--hold)' }
    : { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' };
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 4, border: '1px solid', padding: '10px 16px', fontSize: 13, fontWeight: 500, marginBottom: 12, ...style }}>
      <Icon name={variant === 'warn' ? 'alertCircle' : 'infoCircle'} size={16} />
      {children}
    </div>
  );
}
