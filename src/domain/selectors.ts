import type { Patient, Visit, Checkin } from './types';

export type VisitStatus = 'Staged' | 'Needs Review' | 'Approved' | 'Rejected';

export function sharedContact(patient: Patient, allPatients: Patient[]): boolean {
  return allPatients.filter((p) => p.phone === patient.phone).length >= 2;
}

export function isOverdue(visit: Visit, checkins: Checkin[], now: Date): boolean {
  if (visit.status !== 'Approved') return false;
  if (!visit.approved_date) return false;
  if (visit.approved_date >= now) return false;
  const windowEndMs = visit.approved_date.getTime() + (visit.interval_days ?? 0) * 86400000;
  const patientCheckins = checkins.filter((c) => c.patient_id === visit.patient_id);
  return !patientCheckins.some((c) => c.checkin_date.getTime() <= windowEndMs);
}

export function daysOverdue(visit: Visit, checkins: Checkin[], now: Date): number | null {
  if (!isOverdue(visit, checkins, now)) return null;
  if (!visit.approved_date) return null;
  return Math.floor((now.getTime() - visit.approved_date.getTime()) / 86400000);
}

/** Returns which role must approve a visit based on its priority. */
export function approverFor(priority: 'High' | 'Routine' | null): 'Doctor' | 'Nurse' {
  return priority === 'High' ? 'Doctor' : 'Nurse';
}
