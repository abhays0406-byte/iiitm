import { useState } from 'react';
import { useDomainStore, nextToken } from '@/domain/store';
import type { Patient } from '@/domain/types';
import { Drawer } from '@/ui/Drawer';
import { Button } from '@/ui/Button';
import { Banner } from '@/ui/Banner';

type Sex = Patient['sex'];

const SEXES: { id: Sex; label: string }[] = [
  { id: 'M', label: 'Male' },
  { id: 'F', label: 'Female' },
  { id: 'O', label: 'Other' },
];

interface Errors { name?: string; age?: string; sex?: string; phone?: string }

/**
 * Patient form in a drawer. Registers a new patient, or, when `patient` is given, edits that
 * patient's details (the token stays the same). Calls onCreated with the saved patient.
 * Give it a `key` per patient so the fields start from that patient's details.
 */
export function NewPatientDrawer({ open, onClose, onCreated, patient }: { open: boolean; onClose: () => void; onCreated: (p: Patient) => void; patient?: Patient }) {
  const patients = useDomainStore((s) => s.patients);
  const addPatient = useDomainStore((s) => s.addPatient);
  const updatePatient = useDomainStore((s) => s.updatePatient);
  const editing = !!patient;

  const [name, setName] = useState(patient?.name ?? '');
  const [age, setAge] = useState(patient ? String(patient.age) : '');
  const [sex, setSex] = useState<Sex | null>(patient?.sex ?? null);
  const [phone, setPhone] = useState(patient?.phone ?? '');
  const [noPhone, setNoPhone] = useState(patient ? !patient.phone || patient.unreachable_flag : false);
  const [ward, setWard] = useState(patient?.ward ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const digits = phone.replace(/\D/g, '');
  const sharedWith = !noPhone && digits.length === 10 ? patients.filter((p) => p.phone === digits && p.id !== patient?.id) : [];

  // A field's message goes away as soon as it is edited; the rest stay until the next submit.
  const clearError = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const reset = () => {
    setName(patient?.name ?? ''); setAge(patient ? String(patient.age) : ''); setSex(patient?.sex ?? null);
    setPhone(patient?.phone ?? ''); setNoPhone(patient ? !patient.phone || patient.unreachable_flag : false);
    setWard(patient?.ward ?? ''); setErrors({});
  };
  const close = () => { reset(); onClose(); };

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Enter the patient’s name.';
    const n = Number(age);
    if (!age.trim() || !Number.isInteger(n) || n < 0 || n > 120) e.age = 'Age in years, 0 to 120.';
    if (!sex) e.sex = 'Choose one.';
    if (!noPhone && !/^[6-9]\d{9}$/.test(digits)) e.phone = 'A 10-digit mobile number, or tick “No working phone”.';
    return e;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const data = { name, age: Number(age), sex: sex!, phone: noPhone ? '' : digits, ward, unreachable: noPhone };
    if (patient) {
      updatePatient(patient.id, data);
      onCreated(useDomainStore.getState().patients.find((p) => p.id === patient.id) ?? patient);
      return;
    }
    const created = addPatient(data);
    reset();
    onCreated(created);
  };

  return (
    <Drawer open={open} onClose={close} title={editing ? 'Edit patient details' : 'Register new patient'} width={440}>
      <form className="form-stack" onSubmit={submit} noValidate>
        <div className="token-preview">
          <span className="hint">Token</span>
          <span className="mono">{patient?.token ?? nextToken(patients)}</span>
          <span className="hint">{editing ? 'stays the same' : 'assigned on save'}</span>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="np-name">Full name</label>
          <input id="np-name" value={name} onChange={(e) => { setName(e.target.value); clearError('name'); }} autoComplete="off" placeholder="e.g. Sunita Verma" aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-field" style={{ flex: '0 0 110px' }}>
            <label className="field-label" htmlFor="np-age">Age</label>
            <input id="np-age" inputMode="numeric" value={age} onChange={(e) => { setAge(e.target.value.replace(/\D/g, '').slice(0, 3)); clearError('age'); }} placeholder="Years" aria-invalid={!!errors.age} />
            {errors.age && <span className="field-error">{errors.age}</span>}
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <span className="field-label" id="np-sex">Sex</span>
            <div className="segmented" role="radiogroup" aria-labelledby="np-sex" style={{ width: '100%' }}>
              {SEXES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={sex === s.id}
                  className={sex === s.id ? 'active' : undefined} style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setSex(s.id); clearError('sex'); }}>
                  {s.label}
                </button>
              ))}
            </div>
            {errors.sex && <span className="field-error">{errors.sex}</span>}
          </div>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="np-phone">Mobile number</label>
          <div className={`phone-input${noPhone ? ' disabled' : ''}`}>
            <span className="phone-prefix">+91</span>
            <input id="np-phone" inputMode="tel" value={noPhone ? '' : phone} disabled={noPhone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 12)); clearError('phone'); }}
              placeholder="98765 43210" aria-invalid={!!errors.phone} />
          </div>
          <label className="check-row">
            <input type="checkbox" checked={noPhone} onChange={(e) => { setNoPhone(e.target.checked); clearError('phone'); }} />
            No working phone. An ASHA worker will visit instead.
          </label>
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        {sharedWith.length > 0 && (
          <Banner variant="info">
            This number is already used by {sharedWith.map((p) => p.name).join(', ')}. It will be treated as a shared phone, so reminders use the privacy-safe template.
          </Banner>
        )}

        <div className="form-field">
          <label className="field-label" htmlFor="np-ward">Area / ward <span className="hint">(optional)</span></label>
          <input id="np-ward" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Ward 4, Rampur" />
        </div>

        <p className="hint" style={{ margin: 0 }}>Stored only in this browser as simulated data. Do not enter real patient details.</p>

        <div className="form-actions">
          <Button variant="quiet" onClick={close} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" type="submit" icon={editing ? 'check' : 'plus'} style={{ flex: 2 }}>{editing ? 'Save changes' : 'Register patient'}</Button>
        </div>
      </form>
    </Drawer>
  );
}
