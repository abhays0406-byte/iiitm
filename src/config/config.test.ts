import { describe, it, expect, beforeEach } from 'vitest';
import { extract } from '@/extractor/extract';
import { useConfigStore } from '@/config/store';
import { makeDate } from '@/store/clock';

const visitDate = makeDate(2026, 10, 10);
const config = useConfigStore;

beforeEach(() => {
  config.getState().reset();
});

describe('P10 config-driven extractor', () => {
  it('adding Vaccination category via config makes the extractor use it', () => {
    config.getState().addReasonCategory('Vaccination');
    const r = extract('Vaccination due next month', visitDate);
    expect(r.reasonCategory).toBe('Vaccination');
    expect(config.getState().reasonCategories).toContain('Vaccination');
  });

  it('adding दो हफ्ते phrase pattern via config makes the extractor use it', () => {
    config.getState().addTimePhrasePattern({ pattern: 'दो हफ्ते', kind: 'fixed', days: 14 });
    const r = extract('दवा बदल दी है, दो हफ्ते बाद आना', visitDate);
    expect(r.intervalDays).toBe(14);
    expect(r.targetDate).not.toBeNull();
    expect(r.sourcePhrase).toBe('दो हफ्ते');
  });
});
