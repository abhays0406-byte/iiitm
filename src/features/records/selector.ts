import type { Visit, Checkin, Patient } from '@/domain/types';
import { reconcile, buildQueue } from '@/engine/reconcile';
import { sharedContact } from '@/domain/selectors';
import { makeDate } from '@/store/clock';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Safe row view model: deliberately excludes note_text and reason_category so the
// Records Desk component tree never receives clinical content (RULES.md rule 6).
export interface SafeRow {
  rank: number;
  visitId: string;
  patientId: string;
  token: string;
  name: string;
  contact: string;
  dueDate: string;
  daysOverdue: number;
  priority: 'High' | 'Routine';
  whyThisRank: string;
  shared: boolean;
  unreachable: boolean;
}

export function buildSafeRows(
  visits: Visit[],
  patients: Patient[],
  checkins: Checkin[],
  now: Date,
): SafeRow[] {
  const byPatient = new Map<string, Patient>();
  for (const p of patients) byPatient.set(p.id, p);

  const queue = buildQueue(reconcile(visits, checkins, now));
  const rows: SafeRow[] = [];
  let rank = 0;
  for (const d of queue) {
    const patient = byPatient.get(d.visit.patient_id);
    if (!patient) continue;
    rank += 1;
    rows.push({
      rank,
      visitId: d.visit.id,
      patientId: patient.id,
      token: d.visit.token,
      name: patient.name,
      contact: patient.phone,
      dueDate: fmtDate(d.visit.target_date),
      daysOverdue: d.daysOverdue,
      priority: d.visit.doctor_priority === 'High' ? 'High' : 'Routine',
      whyThisRank: d.whyThisRank,
      shared: sharedContact(patient, patients),
      unreachable: patient.unreachable_flag,
    });
  }
  return rows;
}

export function neutralMessage(token: string): string {
  return `Reminder: District Hospital check-up scheduled for Token #${token}. Please carry your OPD slip.`;
}

export function neutralDateMessage(token: string, date: string): string {
  return `Reminder: District Hospital check-up scheduled for Token #${token} on [${date}]. Please carry your OPD slip.`;
}

const FORBIDDEN = ['diagnosis', 'department', 'specialty', 'reason'];

export function messageContainsForbidden(message: string): boolean {
  const lower = message.toLowerCase();
  return FORBIDDEN.some((w) => lower.includes(w));
}
