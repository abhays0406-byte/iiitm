import React from 'react';

const VARIANT_CLASS: Record<string, string> = {
  neutral: 'pill-neutral',
  outline: 'pill-outline',
  accent: 'pill-accent',
  hold: 'pill-hold',
  high: 'pill-high',
  ok: 'pill-ok',
};

export function Chip({ variant = 'neutral', children, style, title }: { variant?: string; children: React.ReactNode; style?: React.CSSProperties; title?: string }) {
  return (
    <span className={`pill ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.neutral}`} style={style} title={title}>
      {children}
    </span>
  );
}

/** Priority is never colour alone: always a dot plus the word. */
export function PriorityBadge({ priority, missing }: { priority: 'High' | 'Routine'; missing?: boolean }) {
  return (
    <span className={`pill ${priority === 'High' ? 'pill-high' : 'pill-neutral'}`}>
      <span className="dot" />
      {priority}{missing ? ' (default)' : ''}
    </span>
  );
}
