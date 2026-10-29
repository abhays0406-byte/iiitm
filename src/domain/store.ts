import { create } from 'zustand';
import { simulatedNow } from '@/store/clock';
import { parseCSV } from '@/lib/csv';
import { buildSeedData } from '@/seed/seed';
import type { Patient, Visit, Checkin, Outreach, AuditLog } from '@/domain/types';

import csvText from '../../synthetic_opd_seed_notes.csv?raw';

const seedRows = parseCSV(csvText);
const seed = buildSeedData(seedRows);

let idCounter = 0;

function newId(): string {
  return 'id-' + String(++idCounter);
}

interface DomainState {
  actor: string;
  role: string;
  patients: Patient[];
  visits: Visit[];
  checkins: Checkin[];
  outreach: Outreach[];
  audit: AuditLog[];
  setActor: (actor: string, role: string) => void;
  addVisit: (v: Omit<Visit, 'id' | 'created_at' | 'updated_at' | 'simulated'>) => void;
  setExtraction: (visitId: string, extraction: Partial<Pick<Visit, 'interval_days' | 'target_date' | 'reason_category' | 'source_phrase' | 'needs_review' | 'review_reason'>>) => void;
  approveVisit: (visitId: string, priority: 'Routine' | 'High') => void;
  undoApproval: (visitId: string) => void;
  editVisitDate: (visitId: string, date: Date) => void;
  rejectVisit: (visitId: string, reason: string) => void;
  addCheckin: (c: Omit<Checkin, 'id' | 'created_at' | 'simulated'>) => void;
  recordOutreach: (o: Omit<Outreach, 'id' | 'created_at' | 'simulated'>) => void;
  setOutcomeTag: (outreachId: string, tag: string) => void;
  setPriority: (visitId: string, priority: 'Routine' | 'High') => void;
  resetDemo: () => void;
  getAudit: () => AuditLog[];
}

export const useDomainStore = create<DomainState>()(
  (set, get) => ({
      actor: 'Demo User',
      role: 'Doctor',
      patients: seed.patients,
      visits: seed.visits,
      checkins: seed.checkins,
      outreach: seed.outreach,
      audit: seed.audit,

      setActor: (actor, role) => set({ actor, role }),

      addVisit: (v) => {
        const now = simulatedNow();
        const visit: Visit = { ...v, id: newId(), created_at: now, updated_at: now, simulated: true };
        set((state) => {
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'create',
            entity: 'visit',
            entity_id: visit.id,
            before: null,
            after: JSON.stringify(visit),
            timestamp: now,
            simulated: true,
          };
          return { visits: [...state.visits, visit], audit: [...state.audit, entry] };
        });
      },

      setExtraction: (visitId, extraction) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          const next = { ...before, ...extraction, updated_at: now };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'set_extraction',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, audit: [...state.audit, entry] };
        });
      },

      approveVisit: (visitId, priority) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          // Always resolve null priority to the passed default
          const resolvedPriority = before.doctor_priority ?? priority;
          if (before.needs_review && !before.target_date) {
            // Can't approve yet, but record the priority resolution
            if (before.doctor_priority === null) {
              const next: Visit = { ...before, doctor_priority: resolvedPriority, updated_at: now };
              const entry: AuditLog = {
                id: newId(), actor: state.actor, role: state.role, action: 'set_priority',
                entity: 'visit', entity_id: visitId,
                before: JSON.stringify(before), after: JSON.stringify(next),
                timestamp: now, simulated: true,
              };
              const visits = [...state.visits];
              visits[idx] = next;
              return { visits, audit: [...state.audit, entry] };
            }
            return state;
          }
          const next: Visit = {
            ...before,
            doctor_priority: resolvedPriority,
            status: 'Approved',
            approved_date: now,
            approved_by: state.actor,
            approved_at: now,
            updated_at: now,
          };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'approve',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, audit: [...state.audit, entry] };
        });
      },

      undoApproval: (visitId) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          if (before.status !== 'Approved') return state;
          const next: Visit = {
            ...before,
            status: before.needs_review ? 'Needs Review' : 'Staged',
            approved_date: null,
            approved_by: null,
            approved_at: null,
            updated_at: now,
          };
          // Cancel any FollowUpDate outreach for this visit
          const outreach = state.outreach.map((o) =>
            o.visit_id === visitId && o.status === 'Sent'
              ? { ...o, status: 'Failed' as const }
              : o
          );
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'undo_approval',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, outreach, audit: [...state.audit, entry] };
        });
      },

      editVisitDate: (visitId, date) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          const next: Visit = { ...before, approved_date: date, target_date: date, updated_at: now };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'edit_date',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, audit: [...state.audit, entry] };
        });
      },

      rejectVisit: (visitId, reason) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          const next: Visit = { ...before, status: 'Rejected', rejection_reason: reason, updated_at: now };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'reject',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, audit: [...state.audit, entry] };
        });
      },

      addCheckin: (c) => {
        const now = simulatedNow();
        const checkin: Checkin = { ...c, id: newId(), created_at: now, simulated: true };
        set((state) => {
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'create',
            entity: 'checkin',
            entity_id: checkin.id,
            before: null,
            after: JSON.stringify(checkin),
            timestamp: now,
            simulated: true,
          };
          return { checkins: [...state.checkins, checkin], audit: [...state.audit, entry] };
        });
      },

      recordOutreach: (o) => {
        const now = simulatedNow();
        const outreach: Outreach = { ...o, id: newId(), created_at: now, simulated: true };
        set((state) => {
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'create',
            entity: 'outreach',
            entity_id: outreach.id,
            before: null,
            after: JSON.stringify(outreach),
            timestamp: now,
            simulated: true,
          };
          return { outreach: [...state.outreach, outreach], audit: [...state.audit, entry] };
        });
      },

      setOutcomeTag: (outreachId) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.outreach.findIndex((o) => o.id === outreachId);
          if (idx === -1) return state;
          const before = state.outreach[idx];
          const next = { ...before, status: 'Sent' as const, updated_at: now };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'set_outcome_tag',
            entity: 'outreach',
            entity_id: outreachId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const outreach = [...state.outreach];
          outreach[idx] = next;
          return { outreach, audit: [...state.audit, entry] };
        });
      },

      setPriority: (visitId, priority) => {
        const now = simulatedNow();
        set((state) => {
          const idx = state.visits.findIndex((v) => v.id === visitId);
          if (idx === -1) return state;
          const before = state.visits[idx];
          const next: Visit = { ...before, doctor_priority: priority, updated_at: now };
          const entry: AuditLog = {
            id: newId(),
            actor: state.actor,
            role: state.role,
            action: 'set_priority',
            entity: 'visit',
            entity_id: visitId,
            before: JSON.stringify(before),
            after: JSON.stringify(next),
            timestamp: now,
            simulated: true,
          };
          const visits = [...state.visits];
          visits[idx] = next;
          return { visits, audit: [...state.audit, entry] };
        });
      },

      resetDemo: () => {
        const fresh = buildSeedData(parseCSV(csvText));
        set({
          patients: fresh.patients,
          visits: fresh.visits,
          checkins: fresh.checkins,
          outreach: fresh.outreach,
          audit: fresh.audit,
        });
      },

      getAudit: () => get().audit,
  }),
);
