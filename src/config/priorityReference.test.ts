import { describe, it, expect } from 'vitest';
import { suggestPriority } from '@/config/priorityReference';
import { useDomainStore } from '@/domain/store';

describe('Phase 4: Priority Reference Table', () => {
  it('AT-06: reference table suggests High for matching diagnosis but stored doctor_priority is unchanged', () => {
    const store = useDomainStore.getState();
    const visit = store.visits[0];
    const originalPriority = visit.doctor_priority;

    // suggestPriority returns a suggestion but never mutates the store
    const suggestion = suggestPriority('uncontrolled diabetes, review in 2 weeks');
    expect(suggestion).not.toBeNull();
    expect(suggestion!.suggested).toBe('High');

    // doctor_priority in store is unchanged
    const after = useDomainStore.getState().visits.find((v) => v.id === visit.id)!;
    expect(after.doctor_priority).toBe(originalPriority);
  });

  it('suggestPriority never writes doctor_priority to the store', () => {
    const store = useDomainStore.getState();
    const before = store.visits.map((v) => v.doctor_priority);
    suggestPriority('chest pain, review next week');
    const after = useDomainStore.getState().visits.map((v) => v.doctor_priority);
    expect(after).toEqual(before);
  });

  it('no randomness, score or numeric weight: same input always returns same output', () => {
    const note = 'uncontrolled diabetes follow up';
    const r1 = suggestPriority(note);
    const r2 = suggestPriority(note);
    const r3 = suggestPriority(note);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('works for English', () => {
    expect(suggestPriority('chest pain review')!.suggested).toBe('High');
    expect(suggestPriority('routine checkup next month')!.suggested).toBe('Routine');
  });

  it('works for Hinglish', () => {
    expect(suggestPriority('tez bukhar hai, 3 din baad aana')!.suggested).toBe('High');
    expect(suggestPriority('sardi khansi, ek hafte baad')!.suggested).toBe('Routine');
  });

  it('works for Hindi', () => {
    expect(suggestPriority('गर्भवती हैं, अगले महीने आना')!.suggested).toBe('High');
    expect(suggestPriority('खांसी है, एक हफ्ते बाद आना')!.suggested).toBe('Routine');
  });

  it('returns null when no keyword matches', () => {
    expect(suggestPriority('follow up in 2 weeks')).toBeNull();
    expect(suggestPriority('')).toBeNull();
    expect(suggestPriority('review next month')).toBeNull();
  });
});
