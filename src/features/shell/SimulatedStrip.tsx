import { useClockStore, SIMULATED_NOW } from '@/store/clock';
import { Icon } from '@/ui/Icon';
import { fmtDate } from '@/features/records/selector';

export function SimulatedStrip() {
  const now = useClockStore((s) => s.now);
  const isSimulated = now.getTime() !== SIMULATED_NOW.getTime();

  if (!isSimulated) return null;

  return (
    <div className="simulated-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--hold-bg)', borderBottom: '1px solid color-mix(in srgb, var(--hold) 30%, transparent)', padding: '6px 24px', flexShrink: 0, fontSize: 12 }}>
      <span style={{ fontWeight: 500, color: 'var(--hold-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="clock" size={13} />
        Training date is ahead of today. Overdue counts and due dates use this date.
      </span>
      <span style={{ color: 'var(--hold-ink)', fontFamily: 'var(--mono)' }}>Today is {fmtDate(SIMULATED_NOW)} · App date {fmtDate(now)}</span>
    </div>
  );
}
