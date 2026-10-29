import type { Visit, Checkin, Patient } from '@/domain/types';
import { reconcile, buildQueue } from '@/engine/reconcile';
import { sharedContact, isOverdue, dueDate } from '@/domain/selectors';

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

/** Safe view of an approved visit that is not due yet. Same exclusions as SafeRow (RULES.md rule 6). */
export interface UpcomingRow {
  visitId: string;
  patientId: string;
  token: string;
  name: string;
  contact: string;
  dueDate: string;
  daysUntilDue: number;
  priority: 'High' | 'Routine';
  unreachable: boolean;
}

/** Approved follow-ups whose due date has not passed, soonest first. They move to the overdue list once late. */
export function buildUpcomingRows(visits: Visit[], patients: Patient[], checkins: Checkin[], now: Date): UpcomingRow[] {
  const byPatient = new Map<string, Patient>();
  for (const p of patients) byPatient.set(p.id, p);
  const rows: UpcomingRow[] = [];
  for (const v of visits) {
    if (v.status !== 'Approved' || isOverdue(v, checkins, now)) continue;
    const due = dueDate(v);
    const patient = byPatient.get(v.patient_id);
    if (!due || !patient || due < now) continue;
    rows.push({
      visitId: v.id,
      patientId: patient.id,
      token: v.token,
      name: patient.name,
      contact: patient.phone,
      dueDate: fmtDate(due),
      daysUntilDue: Math.round((due.getTime() - now.getTime()) / 86400000),
      priority: v.doctor_priority === 'High' ? 'High' : 'Routine',
      unreachable: patient.unreachable_flag,
    });
  }
  return rows.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.token.localeCompare(b.token));
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
