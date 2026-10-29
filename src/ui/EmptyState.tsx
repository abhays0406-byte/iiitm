import React from 'react';
import { Icon } from './Icon';

export function EmptyState({ title, description, action, icon = 'inbox' }: { title: string; description?: string; action?: React.ReactNode; icon?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <h2 className="empty-title">{title}</h2>
      {description && <p className="empty-desc">{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
