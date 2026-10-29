import React from 'react';

export function Field({ label, value, chip }: { label: string; value: React.ReactNode; chip?: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'baseline', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{value}</div>
      {chip && <span style={{ textAlign: 'right' }}>{chip}</span>}
    </div>
  );
}
