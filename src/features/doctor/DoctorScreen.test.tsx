import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DoctorScreen } from '@/features/doctor/DoctorScreen';
import { useDomainStore } from '@/domain/store';

const store = useDomainStore;

beforeEach(() => {
  store.getState().resetDemo();
});

describe('DoctorScreen', () => {
  it('saves a visit with High priority to the nurse queue on one tap', () => {
    const { container } = render(<DoctorScreen />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Come back after 2 weeks for dressing change' } });

    const highBtn = container.querySelectorAll('button')[1];
    fireEvent.click(highBtn);

    const visits = store.getState().visits;
    expect(visits.length).toBeGreaterThan(0);
    const last = visits[visits.length - 1];
    expect(last.doctor_priority).toBe('High');
    expect(last.status).toBe('Staged');
    expect(last.note_text).toBe('Come back after 2 weeks for dressing change');
    expect(last.source_phrase).toBe('2 weeks');
    expect(last.interval_days).toBe(14);
  });

  it('disables buttons when note is empty', () => {
    const { container } = render(<DoctorScreen />);
    const buttons = container.querySelectorAll('button');
    const routineBtn = Array.from(buttons).find((b) => b.textContent?.includes('Routine'))!;
    const highBtn = Array.from(buttons).find((b) => b.textContent?.includes('High priority'))!;
    expect(routineBtn.disabled).toBe(true);
    expect(highBtn.disabled).toBe(true);
    expect(routineBtn.title).toBe('Write a note first');
  });

  it('clears the slip and shows confirmation after saving', () => {
    const { container } = render(<DoctorScreen />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Review next month' } });
    const routineBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Routine'))!;
    fireEvent.click(routineBtn);
    expect(textarea.value).toBe('');
    expect(container.querySelector('div.saved-confirm')).not.toBeNull();
  });
});
