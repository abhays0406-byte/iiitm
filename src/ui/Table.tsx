import React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <tr onClick={onClick} className={onClick ? 'clickable' : undefined} style={style}>{children}</tr>
  );
}

export function TableCell({ children, colSpan, style, className }: { children?: React.ReactNode; colSpan?: number; style?: React.CSSProperties; className?: string }) {
  return (
    <td colSpan={colSpan} className={className} style={style}>{children}</td>
  );
}
