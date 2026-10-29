import React from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{title}</h2>
      {description && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24, maxWidth: 280 }}>{description}</p>}
      {action}
    </div>
  );
}
