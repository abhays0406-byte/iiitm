import type { Patient, Visit, Checkin } from './types';
import { addDays } from '@/store/clock';

export type VisitStatus = 'Staged' | 'Needs Review' | 'Approved' | 'Rejected';

export function sharedContact(patient: Patient, allPatients: Patient[]): boolean {
  // Patients registered without a phone all have an empty number; that is not a shared phone.
  if (!patient.phone) return false;
  return allPatients.filter((p) => p.phone === patient.phone).length >= 2;
}

/** When the patient is due back: the approved target date, else approval date plus the interval. */
export function dueDate(visit: Visit): Date | null {
  if (visit.target_date) return visit.target_date;
  if (!visit.approved_date) return null;
  return addDays(visit.approved_date, visit.interval_days ?? 0);
}

/**
 * Overdue means the due date has passed and the patient has not checked in between approval
 * and the due date. A visit due today is not overdue yet.
 */
export function isOverdue(visit: Visit, checkins: Checkin[], now: Date): boolean {
  if (visit.status !== 'Approved') return false;
  const due = dueDate(visit);
  if (!due || due >= now) return false;
  const fromMs = visit.approved_date?.getTime() ?? -Infinity;
  const patientCheckins = checkins.filter((c) => c.patient_id === visit.patient_id);
  return !patientCheckins.some((c) => c.checkin_date.getTime() >= fromMs && c.checkin_date.getTime() <= due.getTime());
}

export function daysOverdue(visit: Visit, checkins: Checkin[], now: Date): number | null {
  if (!isOverdue(visit, checkins, now)) return null;
  const due = dueDate(visit)!;
  return Math.floor((now.getTime() - due.getTime()) / 86400000);
}

/** Returns which role must approve a visit based on its priority. */
export function approverFor(priority: 'High' | 'Routine' | null): 'Doctor' | 'Nurse' {
  return priority === 'High' ? 'Doctor' : 'Nurse';
}
