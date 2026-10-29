import React from 'react';
import { Kbd } from '@/ui/Kbd';

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' },
  quiet: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--border)' },
  'danger-quiet': { background: 'transparent', color: 'var(--high)', borderColor: 'var(--high)' },
};

export function Button({
  variant = 'primary',
  size = 'default',
  onClick,
  children,
  disabled,
  kbd,
  style,
  ...rest
}: {
  variant?: 'primary' | 'quiet' | 'danger-quiet';
  size?: 'default' | 'large';
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  kbd?: string;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'>) {
  return (
    <button
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 4, border: '1px solid', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, outline: 'none',
        height: size === 'large' ? 64 : 36,
        padding: size === 'large' ? '0 24px' : '0 12px',
        fontSize: size === 'large' ? 16 : 13,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
}
