import { Icon } from './Icon';

export function Stat({ icon, tone = 'accent', value, label, sub }: {
  icon: string;
  tone?: 'accent' | 'high' | 'ok' | 'hold';
  value: number | string;
  label: string;
  /** One short line of context under the number, e.g. "2 new since you last looked". */
  sub?: string;
}) {
  return (
    <div className="card stat">
      <div className={`stat-top ${tone}`}>
        <Icon name={icon} size={15} />
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
