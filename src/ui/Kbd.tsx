import React from 'react';

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 5px', border: '1px solid currentColor', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
      {children}
    </kbd>
  );
}
