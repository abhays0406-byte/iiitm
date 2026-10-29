import React from 'react';
import { Kbd } from '@/ui/Kbd';
import { Icon } from '@/ui/Icon';

type Variant = 'primary' | 'quiet' | 'danger-quiet' | 'danger' | 'ghost';

export function Button({
  variant = 'primary',
  size = 'default',
  onClick,
  children,
  disabled,
  kbd,
  icon,
  style,
  className,
  ...rest
}: {
  variant?: Variant;
  size?: 'small' | 'default' | 'large';
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  kbd?: string;
  /** Icon name from the shared set, shown before the label. */
  icon?: string;
  style?: React.CSSProperties;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'>) {
  const sizeClass = size === 'large' ? ' btn-lg' : size === 'small' ? ' btn-sm' : '';
  return (
    <button
      type="button"
      className={`btn btn-${variant}${sizeClass}${className ? ` ${className}` : ''}`}
      style={style}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'large' ? 18 : 15} />}
      {children}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
}
