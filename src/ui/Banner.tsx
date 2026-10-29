import React from 'react';
import { Icon } from './Icon';

type Variant = 'info' | 'warn' | 'ok';

const ICON: Record<Variant, string> = { info: 'infoCircle', warn: 'alertTriangle', ok: 'checkCircle' };

export function Banner({ variant = 'info', children, style }: { variant?: Variant; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div role="status" className={`banner banner-${variant}`} style={style}>
      <Icon name={ICON[variant]} size={16} />
      <div>{children}</div>
    </div>
  );
}
