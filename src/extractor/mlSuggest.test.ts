import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mlSuggest } from '@/extractor/mlSuggest';
import { extract } from '@/extractor/extract';
import { makeDate } from '@/store/clock';

const visitDate = makeDate(2026, 10, 10);

// ── Test 1: fixture rows ──────────────────────────────────────────────────────
// model.fixture.json is only present after train.py has been run.
// When absent, we skip gracefully so CI doesn't break before first training.
describe('mlCategoryModel fixture accuracy', () => {
  it('suggests correct category for ≥60% of fixture rows (skips if model not trained)', async () => {
    let fixture: Array<{ note_text: string; reason_category: string }>;
    try {
      const mod = await import('@/extractor/model.fixture.json');
      fixture = mod.default as typeof fixture;
    } catch {
      console.log('model.fixture.json not found — run scripts/ml/train.py first. Skipping.');
      return;
    }

    const { suggestReason } = await import('@/extractor/mlCategoryModel');
    const allowed = ['Lab Review', 'Medication Titration', 'Surgical Dressing', 'General Follow-Up'];

    let correct = 0;
    for (const row of fixture) {
      const result = await suggestReason(row.note_text, allowed);
      if (result?.reasonCategory === row.reason_category) correct++;
    }

    const accuracy = correct / fixture.length;
    console.log(`Fixture accuracy: ${correct}/${fixture.length} = ${(accuracy * 100).toFixed(1)}%`);
    expect(accuracy).toBeGreaterThanOrEqual(0.6);
  });
});

// ── Test 2: Needs Review note — ML must NOT set a date ────────────────────────
describe('Needs Review invariant', () => {
  it('needsReview note never gets a targetDate from ML', () => {
    const needsReviewNotes = [
      'Come back if fever returns.',
      'Follow up soon.',
      'Review after Diwali.',
      'Agar dard badhe to aana.',
    ];

    for (const note of needsReviewNotes) {
      const result = extract(note, visitDate);
      if (result.needsReview) {
        // The ML suggestion may exist but targetDate must always be null
        expect(result.targetDate).toBeNull();
      }
    }
  });
});

// ── Test 3: No fetch / network call ──────────────────────────────────────────
describe('No network usage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('fetch must not be called'); }));
  });

  it('mlSuggest never calls fetch', () => {
    mlSuggest('Come back after 2 weeks for dressing', 'Surgical Dressing', null);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('extract never calls fetch', () => {
    extract('Review blood test next month', visitDate);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
