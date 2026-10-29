import { useClockStore } from '@/store/clock';

export function SimulatedStrip() {
  const { now } = useClockStore();
  const isSimulated = now.getTime() !== new Date(2026, 10, 12).getTime();

  if (!isSimulated) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--warn)', background: 'rgba(232,160,0,0.08)', padding: '4px 16px', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--hold)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span role="img" aria-label="simulated">•</span>
        Simulated data. Not real patients.
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Clock: {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    </div>
  );
}
