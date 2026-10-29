export type VisitStatus = 'Staged' | 'Needs Review' | 'Approved' | 'Rejected';
export type Priority = 'Routine' | 'High';

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'M' | 'F' | 'O';
  phone: string;
  token: string;
  ward?: string;
  unreachable_flag: boolean;
  shared_contact: boolean;
  created_at: Date;
  updated_at: Date;
  simulated: boolean;
}

export interface Visit {
  id: string;
  patient_id: string;
  token: string;
  visit_date: Date;
  note_text: string | null;
  doctor_priority: Priority | null;
  status: VisitStatus;
  approved_date: Date | null;
  approved_by: string | null;
  approved_at: Date | null;
  interval_days: number | null;
  target_date: Date | null;
  reason_category: string | null;
  source_phrase: string | null;
  needs_review: boolean;
  review_reason: string | null;
  rejection_reason: string | null;
  simulated: boolean;
  created_at: Date;
  updated_at: Date;
}

/** A scan or photo of the doctor's paper slip, attached to a visit. Clinical: never sent to the Records Desk. */
export interface Slip {
  visit_id: string;
  name: string;
  type: string;
  size: number;
  data_url: string;
  attached_at: Date;
}

export interface Checkin {
  id: string;
  patient_id: string;
  visit_id: string;
  checkin_date: Date;
  mode: 'OPD' | 'Phone' | 'ASHA';
  simulated: boolean;
  created_at: Date;
}

export interface Outreach {
  id: string;
  patient_id: string;
  visit_id: string;
  channel: 'SMS' | 'Phone' | 'ASHA';
  message: string;
  status: 'Queued' | 'Sent' | 'Failed';
  sent_at: Date | null;
  simulated: boolean;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  entity_id: string;
  before: string | null;
  after: string | null;
  timestamp: Date;
  simulated: boolean;
}
