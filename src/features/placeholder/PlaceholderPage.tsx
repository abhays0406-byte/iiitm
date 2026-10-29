import { EmptyState } from '@/ui/EmptyState';

export function PlaceholderPage({ role, heading, description }: { role: string; heading: string; description: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 16px', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{heading}</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{description}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-3)' }}>Role: {role}</div>
      </div>
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <EmptyState
          title="Placeholder screen"
          description={`The ${role} screen will be built in the next step.`}
        />
      </div>
    </div>
  );
}
