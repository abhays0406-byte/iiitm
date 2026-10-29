/**
 * mlCategoryModel.ts
 *
 * In-browser logistic regression inference for reason-category suggestion.
 * Reads the weights exported by scripts/ml/train.py → model.json.
 *
 * Rules:
 *  - Pure function. No network, no fetch, no backend.
 *  - Returns a *suggestion* only. The doctor's tap always decides.
 *  - Never touches interval, date, priority, or Needs Review logic.
 *  - Returns null when model.json is absent (before first training run).
 */

const SPLIT = /[\s.,;:!?()[\]{"'/\\|-]+/;

function featureSet(text: string): Set<string> {
  const t = text.toLowerCase().split(SPLIT).filter(Boolean);
  const f = new Set<string>(t);
  for (let i = 0; i < t.length - 1; i++) f.add(`${t[i]} ${t[i + 1]}`);
  return f;
}

export interface MlCategorySuggestion {
  reasonCategory: string;
  /** Softmax probability 0–1 */
  confidence: number;
}

let _model: {
  classes: string[];
  intercept: number[];
  weights: Record<string, number[]>;
} | null = null;

async function loadModel() {
  if (_model) return _model;
  try {
    const m = await import('./model.json');
    _model = (m.default as unknown) as NonNullable<typeof _model>;
  } catch {
    // model.json not yet generated — train.py hasn't been run yet
    _model = null;
  }
  return _model;
}

/**
 * Suggest a reason category for the given note text.
 *
 * @param note      Raw note text (EN / Hinglish / Hindi)
 * @param allowed   Categories to restrict output to (from config store)
 * @returns suggestion or null if model unavailable / confidence too low
 */
export async function suggestReason(
  note: string,
  allowed: string[],
): Promise<MlCategorySuggestion | null> {
  if (!note.trim()) return null;
  const model = await loadModel();
  if (!model) return null;

  const feats = featureSet(note);
  const scores = [...model.intercept];
  const w = model.weights;

  for (const f of feats) {
    const row = w[f];
    if (row) row.forEach((v, i) => (scores[i] += v));
  }

  // Softmax
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map((e) => e / sum);

  const best = probs.indexOf(Math.max(...probs));
  const label = model.classes[best];

  if (!allowed.includes(label) || probs[best] < 0.6) return null;
  return { reasonCategory: label, confidence: probs[best] };
}
