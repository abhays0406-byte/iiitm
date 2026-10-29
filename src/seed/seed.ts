import { SIMULATED_NOW, daysFrom } from '@/store/clock';
import type { Patient, Visit, Checkin, Outreach, AuditLog } from '@/domain/types';

// Seed dates are relative to the day the app opens, so overdue counts read the same on any date.
const NOW = SIMULATED_NOW;
const ago = (days: number) => daysFrom(NOW, -days);

function makePatient(overrides: Partial<Patient>): Patient {
  return {
    id: '',
    name: '',
    age: 30,
    sex: 'M',
    phone: '',
    token: '',
    unreachable_flag: false,
    shared_contact: false,
    created_at: NOW,
    updated_at: NOW,
    simulated: true,
    ...overrides,
  };
}

function makeVisit(overrides: Partial<Visit>): Visit {
  return {
    id: '',
    patient_id: '',
    token: '',
    visit_date: NOW,
    note_text: null,
    doctor_priority: null,
    status: 'Staged',
    approved_date: null,
    approved_by: null,
    approved_at: null,
    interval_days: null,
    target_date: null,
    reason_category: null,
    source_phrase: null,
    needs_review: false,
    review_reason: null,
    rejection_reason: null,
    simulated: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

export function buildSeedData(csvRows: Record<string, string>[]) {
  const patients: Patient[] = [];
  const visits: Visit[] = [];
  const checkins: Checkin[] = [];
  const outreach: Outreach[] = [];
  const audit: AuditLog[] = [];

  let pid = 1;
  const addPatient = (p: Partial<Patient>) => {
    const patient = makePatient({ id: `P-${String(pid).padStart(3, '0')}`, ...p });
    pid += 1;
    patients.push(patient);
    return patient;
  };

  let vid = 1;
  const addVisitFor = (patient: Patient, v: Partial<Visit>) => {
    const visit = makeVisit({
      id: `V-${String(vid).padStart(4, '0')}`,
      patient_id: patient.id,
      token: patient.token,
      ...v,
    });
    vid += 1;
    visits.push(visit);
    return visit;
  };

  // ---- 30 CSV patients ----
  for (const row of csvRows) {
    const needsReview = row.needs_review === '1';
    const priority = row.doctor_priority || null;
    const patient = addPatient({
      name: row.patient_name,
      age: Number(row.age) || 30,
      sex: (row.sex as any) || 'M',
      phone: row.phone,
      token: row.token,
    });
    addVisitFor(patient, {
      visit_date: ago(3 - (Number(row.visit_id.replace('V-', '')) % 3)),
      note_text: row.note_text || null,
      doctor_priority: priority as any,
      status: needsReview ? ('Needs Review' as const) : ('Staged' as const),
      needs_review: needsReview,
    });
  }

  // ---- 6 extra approved patients (A-F). Names are synthetic. ----
  const A = addPatient({ name: 'Mohan Lal', age: 50, sex: 'M', phone: '9000000031', token: 'OPD-0501', unreachable_flag: false });
  const B = addPatient({ name: 'Kavya Iyer', age: 42, sex: 'F', phone: '9000000032', token: 'OPD-0502', unreachable_flag: false });
  const C = addPatient({ name: 'Harish Chandra', age: 55, sex: 'M', phone: '9000000033', token: 'OPD-0503', unreachable_flag: false });
  const D = addPatient({ name: 'Anjali Mishra', age: 38, sex: 'F', phone: '9000000034', token: 'OPD-0504', unreachable_flag: false });
  const E = addPatient({ name: 'Bhola Prasad', age: 60, sex: 'M', phone: '9000000035', token: 'OPD-0505', unreachable_flag: true, ward: 'Ward 7, Rampur' });
  const F = addPatient({ name: 'Rekha Thakur', age: 45, sex: 'F', phone: '9000000036', token: 'OPD-0506', unreachable_flag: false });

  // Household members: C2 shares phone with C (9000000033), D2 shares phone with D (9000000034)
  addPatient({ name: 'Savitri Chandra', age: 52, sex: 'F', phone: '9000000033', token: 'OPD-0507', unreachable_flag: false });
  addPatient({ name: 'Raj Mishra', age: 40, sex: 'M', phone: '9000000034', token: 'OPD-0508', unreachable_flag: false });

  // Second unreachable patient
  addPatient({ name: 'Kiran Pal', age: 33, sex: 'O', phone: '9000000037', token: 'OPD-0509', unreachable_flag: true, ward: 'Ward 3, Sitapur Road' });

  // Approved visits for A-F. Overdue counts from the due date (target_date):
  // today, A is 12 days late, B 2, C 7, D 5, E 9; F checked in on time.
  addVisitFor(A, { status: 'Approved', doctor_priority: 'Routine', approved_date: ago(26), approved_by: 'Doctor', approved_at: ago(26), interval_days: 14, target_date: ago(12), needs_review: false });
  addVisitFor(B, { status: 'Approved', doctor_priority: 'High', approved_date: ago(9), approved_by: 'Doctor', approved_at: ago(9), interval_days: 7, target_date: ago(2), needs_review: false });
  addVisitFor(C, { status: 'Approved', doctor_priority: 'High', approved_date: ago(17), approved_by: 'Doctor', approved_at: ago(17), interval_days: 10, target_date: ago(7), needs_review: false });
  addVisitFor(D, { status: 'Approved', doctor_priority: 'Routine', approved_date: ago(15), approved_by: 'Doctor', approved_at: ago(15), interval_days: 10, target_date: ago(5), needs_review: false });
  addVisitFor(E, { status: 'Approved', doctor_priority: 'Routine', approved_date: ago(23), approved_by: 'Doctor', approved_at: ago(23), interval_days: 14, target_date: ago(9), needs_review: false });
  addVisitFor(F, { status: 'Approved', doctor_priority: 'Routine', approved_date: ago(11), approved_by: 'Doctor', approved_at: ago(11), interval_days: 7, target_date: ago(4), needs_review: false });

  // Checkin for F on its due date -> NOT overdue
  const fVisit = visits.find((v) => v.patient_id === F.id)!;
  checkins.push({
    id: 'CHK-0001',
    patient_id: F.id,
    visit_id: fVisit.id,
    checkin_date: ago(4),
    mode: 'OPD',
    simulated: true,
    created_at: NOW,
  });

  return { patients, visits, checkins, outreach, audit };
}

export type SeedData = ReturnType<typeof buildSeedData>;
