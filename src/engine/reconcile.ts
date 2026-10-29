import type { Visit, Checkin } from '../domain/types';
import { isOverdue, daysOverdue } from '../domain/selectors';

export interface OverdueDefaulter {
  visit: Visit;
  daysOverdue: number;
  whyThisRank: string;
}

export function reconcile(visits: Visit[], checkins: Checkin[], now: Date): OverdueDefaulter[] {
  const defaulters: OverdueDefaulter[] = [];
  for (const visit of visits) {
    if (!isOverdue(visit, checkins, now)) continue;
    const days = daysOverdue(visit, checkins, now) ?? 0;
    defaulters.push({ visit, daysOverdue: days, whyThisRank: '' });
  }
  return defaulters;
}

export function buildQueue(defaulters: OverdueDefaulter[]): OverdueDefaulter[] {
  const ranked = [...defaulters].sort((a, b) => {
    const pa = a.visit.doctor_priority === 'High' ? 0 : 1;
    const pb = b.visit.doctor_priority === 'High' ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return (a.visit.token ?? '').localeCompare(b.visit.token ?? '');
  });
  ranked.forEach((item) => {
    const prio = item.visit.doctor_priority === 'High' ? 'High priority (doctor)' : 'Routine';
    item.whyThisRank = `${prio} · ${item.daysOverdue} days overdue`;
  });
  return ranked;
}
