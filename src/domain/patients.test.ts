import { describe, it, expect, beforeEach } from 'vitest';
import { useDomainStore, nextToken } from '@/domain/store';
import { sharedContact } from '@/domain/selectors';

const store = useDomainStore;

beforeEach(() => {
  store.getState().resetDemo();
});

describe('patient registration', () => {
  it('gives the next free OPD token and appends the patient', () => {
    const before = store.getState().patients;
    const expected = nextToken(before);
    const p = store.getState().addPatient({ name: '  Sunita Verma ', age: 34, sex: 'F', phone: '9811122233', ward: 'Ward 4', unreachable: false });
    expect(p.token).toBe(expected);
    expect(p.name).toBe('Sunita Verma');
    expect(store.getState().patients).toHaveLength(before.length + 1);
    expect(store.getState().patients.at(-1)!.id).toBe(p.id);
  });

  it('writes an audit entry (rule 7)', () => {
    const p = store.getState().addPatient({ name: 'Arun Das', age: 61, sex: 'M', phone: '9822233344', unreachable: false });
    const entry = store.getState().audit.at(-1)!;
    expect(entry.action).toBe('register_patient');
    expect(entry.entity_id).toBe(p.id);
    expect(entry.before).toBeNull();
  });

  it('flags a reused phone as shared, and a missing phone as unreachable but not shared', () => {
    const s = store.getState();
    const existing = s.patients.find((x) => x.phone)!;
    const sharer = s.addPatient({ name: 'Meena Rao', age: 40, sex: 'F', phone: existing.phone, unreachable: false });
    expect(sharer.shared_contact).toBe(true);
    const noPhone1 = store.getState().addPatient({ name: 'Ganga Ram', age: 70, sex: 'M', phone: '', unreachable: true });
    const noPhone2 = store.getState().addPatient({ name: 'Lalit Kumar', age: 66, sex: 'M', phone: '', unreachable: true });
    const all = store.getState().patients;
    expect(noPhone1.unreachable_flag).toBe(true);
    expect(sharedContact(noPhone1, all)).toBe(false);
    expect(sharedContact(noPhone2, all)).toBe(false);
  });
});

describe('editing a patient', () => {
  it('changes the details, keeps the token, and writes an audit entry', () => {
    const p = store.getState().addPatient({ name: 'Arun Das', age: 61, sex: 'M', phone: '9822233344', unreachable: false });
    store.getState().updatePatient(p.id, { name: 'Arun Kumar Das', age: 62, sex: 'M', phone: '', ward: 'Ward 2', unreachable: true });
    const after = store.getState().patients.find((x) => x.id === p.id)!;
    expect(after.name).toBe('Arun Kumar Das');
    expect(after.age).toBe(62);
    expect(after.token).toBe(p.token);
    expect(after.phone).toBe('');
    expect(after.unreachable_flag).toBe(true);
    const entry = store.getState().audit.at(-1)!;
    expect(entry.action).toBe('edit_patient');
    expect(JSON.parse(entry.before!).name).toBe('Arun Das');
    expect(JSON.parse(entry.after!).name).toBe('Arun Kumar Das');
  });
});
