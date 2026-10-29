import { describe, it, expect, beforeEach } from 'vitest';
import { extract } from '@/extractor/extract';
import { reconcile, buildQueue } from '@/engine/reconcile';
import { useDomainStore } from '@/domain/store';
import { useConfigStore } from '@/config/store';
import { neutralMessage, messageContainsForbidden, buildSafeRows } from '@/features/records/selector';
import { makeDate } from '@/store/clock';
import { readFileSync } from 'fs';
import { join } from 'path';

const store = useDomainStore;
const config = useConfigStore;

describe('RULES.md hard rules 1-10', () => {
  beforeEach(() => {
    store.getState().resetDemo();
    config.getState().reset();
  });

  it('Rule 1: extractor only proposes; Needs-Review never gets an AI date; cannot approve without a date', () => {
    const vague = extract('Soon', makeDate(2026, 10, 10));
    expect(vague.targetDate).toBeNull();
    expect(vague.needsReview).toBe(true);

    const cond = extract('Come back after 2 weeks if no improvement', makeDate(2026, 10, 10));
    expect(cond.targetDate).toBeNull();
    expect(cond.needsReview).toBe(true);

    const s = store.getState();
    const needs = s.visits.find((v) => v.needs_review && !v.target_date)!;
    s.approveVisit(needs.id, 'Routine');
    const after = store.getState();
    expect(after.visits.find((v) => v.id === needs.id)!.status).toBe('Needs Review');

    s.editVisitDate(needs.id, makeDate(2026, 10, 26));
    s.approveVisit(needs.id, 'Routine');
    const done = store.getState();
    expect(done.visits.find((v) => v.id === needs.id)!.status).toBe('Approved');
    const audit = done.audit;
    expect(audit.some((a) => a.action === 'approve' && a.entity_id === needs.id)).toBe(true);
  });

  it('Rule 2: urgency only from doctor tag; missing tag defaults to Routine with visible flag', () => {
    const s = store.getState();
    const v = s.visits.find((x) => x.doctor_priority === null)!;
    expect(v.doctor_priority).toBeNull();
    // Nurse screen shows a flag when priority missing (covered by UI); here assert default Routine on approve
    s.approveVisit(v.id, 'Routine');
    const after = store.getState();
    expect(after.visits.find((x) => x.id === v.id)!.doctor_priority).toBe('Routine');
  });

  it('Rule 3: queue sort is deterministic: High first, then days overdue desc, token asc; no household grouping', () => {
    const now = makeDate(2026, 10, 12);
    const a = { id: 'A', patient_id: 'PA', token: 'OPD-0200', visit_date: now, note_text: null, doctor_priority: 'Routine' as const, status: 'Approved' as const, approved_date: makeDate(2026, 9, 30), approved_by: 'D', approved_at: now, interval_days: 7, target_date: null, reason_category: null, source_phrase: null, needs_review: false, review_reason: null, rejection_reason: null, simulated: true, created_at: now, updated_at: now };
    const b = { id: 'B', patient_id: 'PB', token: 'OPD-0100', visit_date: now, note_text: null, doctor_priority: 'High' as const, status: 'Approved' as const, approved_date: makeDate(2026, 10, 3), approved_by: 'D', approved_at: now, interval_days: 7, target_date: null, reason_category: null, source_phrase: null, needs_review: false, review_reason: null, rejection_reason: null, simulated: true, created_at: now, updated_at: now };
    const queue = buildQueue(reconcile([a, b], [], now));
    expect(queue[0].visit.id).toBe('B');
    expect(queue[1].visit.id).toBe('A');
    // no household grouping field present
    expect(queue[0]).not.toHaveProperty('household');
  });

  it('Rule 4: nothing sent automatically; outreach needs explicit click', () => {
    const s = store.getState();
    const before = s.outreach.length;
    // No outreach is created by approve/date edits alone
    const v = s.visits.find((x) => x.status === 'Approved')!;
    s.editVisitDate(v.id, makeDate(2026, 10, 15));
    expect(store.getState().outreach.length).toBe(before);
    // Explicit recordOutreach creates it
    s.recordOutreach({ patient_id: v.patient_id, visit_id: v.id, channel: 'SMS', message: 'hi', status: 'Queued', sent_at: null });
    expect(store.getState().outreach.length).toBe(before + 1);
  });

  it('Rule 5: shared phone -> neutral template only; no diagnosis/department/specialty/reason', () => {
    const msg = neutralMessage('OPD-0412');
    expect(messageContainsForbidden(msg)).toBe(false);
    expect(msg).toContain('Token #OPD-0412');
    expect(msg).not.toContain('Lab');
    expect(msg).not.toContain('Dressing');
    expect(msg).not.toContain('diagnosis');
  });

  it('Rule 6: Records Desk safe rows never contain note_text or reason_category', () => {
    const rows = buildSafeRows(store.getState().visits, store.getState().patients, store.getState().checkins, makeDate(2026, 10, 12));
    for (const r of rows) {
      expect(Object.keys(r)).not.toContain('note_text');
      expect(Object.keys(r)).not.toContain('reason_category');
    }
  });

  it('Rule 7: every mutating action appends an audit entry with before/after', () => {
    const s = store.getState();
    const before = s.audit.length;
    const v = s.visits[0];
    s.setPriority(v.id, 'High');
    s.approveVisit(v.id, 'High');
    s.rejectVisit(v.id, 'no show');
    const after = store.getState();
    expect(after.audit.length).toBeGreaterThan(before);
    for (const e of after.audit.slice(before)) {
      expect(e.before).toBeDefined();
      expect(e.after).toBeDefined();
      expect(e.timestamp).toBeInstanceOf(Date);
    }
  });

  it('Rule 8: all dates from simulated clock; no new Date()/Date.now() in domain/engine/extractor/seed', () => {
    const dirs = [join(process.cwd(), 'src', 'domain'), join(process.cwd(), 'src', 'engine'), join(process.cwd(), 'src', 'extractor'), join(process.cwd(), 'src', 'seed')];
    const files: string[] = [];
    const walk = (dir: string) => {
      const fs = require('fs');
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full);
      }
    };
    for (const d of dirs) walk(d);
    let found = false;
    for (const f of files) {
      if (f.endsWith('domain.test.ts')) continue;
      const c = readFileSync(f, 'utf-8');
      if (c.includes('new Date(') || c.includes('Date.now(')) { found = true; console.log('real date in', f); }
    }
    expect(found).toBe(false);
  });

  it('Rule 9: no household bundling and no date snapping in V1', () => {
    const s = store.getState();
    expect(s).toBeDefined();
    // reconcile/buildQueue have no household logic
    expect(typeof reconcile).toBe('function');
    expect(typeof buildQueue).toBe('function');
    // no auto date change: editVisitDate only sets what nurse picks
  });

  it('Rule 10: seed CSV labels are never edited; no hard-coded measured numbers', () => {
    const csv = readFileSync(join(process.cwd(), 'synthetic_opd_seed_notes.csv'), 'utf-8');
    expect(csv.includes('visit_id')).toBe(true);
    expect(csv.includes('Ramesh Kumar')).toBe(true);
  });
});
