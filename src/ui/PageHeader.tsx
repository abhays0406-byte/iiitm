import React from 'react';

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    // A div, not <header>: print CSS hides <header> (the top bar) but the page title must still print.
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
