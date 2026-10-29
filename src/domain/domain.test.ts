import { describe, it, expect, beforeEach } from 'vitest';
import { useDomainStore } from '@/domain/store';
import { sharedContact, isOverdue, daysOverdue } from '@/domain/selectors';
import { buildSeedData } from '@/seed/seed';
import { parseCSV } from '@/lib/csv';
import csvText from '../../synthetic_opd_seed_notes.csv?raw';
import { SIMULATED_NOW } from '@/store/clock';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const rows = parseCSV(csvText);
const seed = buildSeedData(rows);

function getStore() {
  return useDomainStore.getState();
}

// Seed patients A-F, C2, D2 have synthetic names; tests find them by their fixed token.
const TOKEN = { A: 'OPD-0501', B: 'OPD-0502', C: 'OPD-0503', D: 'OPD-0504', E: 'OPD-0505', F: 'OPD-0506', C2: 'OPD-0507', D2: 'OPD-0508' } as const;

function findPatient(key: keyof typeof TOKEN) {
  return seed.patients.find((p) => p.token === TOKEN[key])!;
}

describe('P2 domain model', () => {
  beforeEach(() => {
    getStore().resetDemo();
  });

  it('loads 30 patients from CSV', () => {
    const csvPatients = seed.patients.filter((p) => p.token.startsWith('OPD-04'));
    expect(csvPatients.length).toBe(30);
  });

  it('sharedContact is true only for the 2 households', () => {
    const all = seed.patients;
    const shared = all.filter((p) => sharedContact(p, all));
    expect(shared.map((p) => p.id).sort()).toEqual(
      [findPatient('C').id, findPatient('C2').id, findPatient('D').id, findPatient('D2').id].sort()
    );
    expect(shared.length).toBe(4);
  });

  it('exactly 2 phone numbers are shared across 2 patients each', () => {
    const phoneCounts = new Map<string, number>();
    for (const p of seed.patients) phoneCounts.set(p.phone, (phoneCounts.get(p.phone) || 0) + 1);
    const sharedPhones = [...phoneCounts.entries()].filter(([, c]) => c >= 2);
    expect(sharedPhones.length).toBe(2);
    for (const [, c] of sharedPhones) expect(c).toBe(2);
  });

  it('exactly 2 patients have unreachable_flag true', () => {
    const unreachable = seed.patients.filter((p) => p.unreachable_flag);
    expect(unreachable.length).toBe(2);
  });

  it('isOverdue / daysOverdue for A-F', () => {
    const now = SIMULATED_NOW;
    const visitsByPatient = new Map<string, any>();
    for (const v of seed.visits) visitsByPatient.set(v.patient_id, v);

    // Days overdue count from each visit's due date.
    const cases: Array<[keyof typeof TOKEN, boolean, number | null]> = [
      ['A', true, 12],
      ['B', true, 2],
      ['C', true, 7],
      ['D', true, 5],
      ['E', true, 9],
      ['F', false, null],
    ];
    for (const [key, expectedOverdue, expectedDays] of cases) {
      const p = findPatient(key);
      const v = visitsByPatient.get(p.id)!;
      expect(isOverdue(v, seed.checkins, now)).toBe(expectedOverdue);
      expect(daysOverdue(v, seed.checkins, now)).toBe(expectedDays);
    }
  });

  it('every mutating action creates an audit entry with before and after', () => {
    const store = getStore();
    const beforeCount = store.audit.length;

    const v = seed.visits[0];
    store.setPriority(v.id, 'High');
    store.approveVisit(v.id, 'High');
    store.editVisitDate(v.id, SIMULATED_NOW);
    store.rejectVisit(v.id, 'Test rejection');

    const after = getStore();
    expect(after.audit.length).toBeGreaterThan(beforeCount);
    for (const entry of after.audit.slice(beforeCount)) {
      expect(entry.before).toBeDefined();
      expect(entry.after).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      // The signed-in staff member and their role are recorded on every entry.
      expect(entry.actor).toBe(after.actor);
      expect(entry.actor).toBeTruthy();
      expect(entry.role).toBe(after.role);
    }
  });

  it('AuditLog has no update/delete/clear exports', () => {
    const state = getStore();
    const stateKeys = Object.keys(state);
    expect(stateKeys).not.toContain('updateAudit');
    expect(stateKeys).not.toContain('deleteAudit');
    expect(stateKeys).not.toContain('clearAudit');
    expect(typeof state.getAudit).toBe('function');
  });

  it('seed is identical across two runs', () => {
    const a = buildSeedData(parseCSV(csvText));
    const b = buildSeedData(parseCSV(csvText));
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('resetDemo restores seed state', () => {
    const store = getStore();
    store.setPriority(seed.visits[0].id, 'High');
    store.resetDemo();
    const after = getStore();
    expect(after.visits.length).toBe(seed.visits.length);
    expect(after.audit.length).toBe(seed.audit.length);
  });
});

describe('P2 no-real-date rule', () => {
  it('no file in src/domain or src/seed uses new Date( or Date.now(', () => {
    const root = join(process.cwd(), 'src');
    const domainDir = join(root, 'domain');
    const seedDir = join(root, 'seed');
    const targetDirs: string[] = [domainDir, seedDir];
    const files: string[] = [];
    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full);
      }
    }
    for (const d of targetDirs) walk(d);

    let found = false;
    for (const f of files) {
      if (f.endsWith('domain.test.ts')) continue;
      const content = readFileSync(f, 'utf-8');
      if (content.includes('new Date(') || content.includes('Date.now(')) {
        console.log('FOUND real date in', f);
        found = true;
      }
    }
    expect(found).toBe(false);
  });
});
