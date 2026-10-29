"""
train.py — Reason-category classifier for OPD follow-up notes.

Input : data/ml/adaption_notes.csv  (columns: note_text, reason_category, has_followup)
Output: src/extractor/model.json    (weights for in-browser logistic regression)
        src/extractor/model.fixture.json  (30 test rows for vitest)

Run from project root:
    python scripts/ml/train.py
"""

import csv, json, re, random

try:
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.linear_model import LogisticRegression
except ImportError:
    raise SystemExit("scikit-learn not found. Run: pip install scikit-learn")

SPLIT = re.compile(r"[\s.,;:!?()\[\]{\"'/\\|-]+")

VALID_CATEGORIES = {
    "Lab Review",
    "Medication Titration",
    "Surgical Dressing",
    "General Follow-Up",
}


def features(text: str) -> dict:
    t = [w for w in SPLIT.split(text.lower()) if w]
    f = set(t) | {a + " " + b for a, b in zip(t, t[1:])}
    return {k: 1 for k in f}


# ── Load CSV ──────────────────────────────────────────────────────────────────
csv_path = "data/ml/adaption_notes.csv"
try:
    raw = list(csv.DictReader(open(csv_path, encoding="utf-8")))
except FileNotFoundError:
    raise SystemExit(
        f"CSV not found at {csv_path}.\n"
        "Download from Adaption, rename to adaption_notes.csv, place in data/ml/"
    )

rows = [r for r in raw if r.get("reason_category", "").strip() in VALID_CATEGORIES]
if len(rows) < 100:
    raise SystemExit(
        f"Only {len(rows)} valid rows found (need ≥100). "
        "Check that reason_category column uses exactly: "
        + ", ".join(sorted(VALID_CATEGORIES))
    )

print(f"Loaded {len(rows)} rows from {csv_path}")

# Category distribution
from collections import Counter
dist = Counter(r["reason_category"] for r in rows)
for cat, n in sorted(dist.items()):
    print(f"  {cat}: {n}")

# ── Train / test split ────────────────────────────────────────────────────────
random.Random(42).shuffle(rows)
cut = int(len(rows) * 0.8)
train, test = rows[:cut], rows[cut:]

# ── Vectorise + train ─────────────────────────────────────────────────────────
vec = DictVectorizer(sparse=True)
X_train = vec.fit_transform([features(r["note_text"]) for r in train])
y_train = [r["reason_category"] for r in train]

clf = LogisticRegression(max_iter=1000, C=2.0, solver="lbfgs")
clf.fit(X_train, y_train)

X_test = vec.transform([features(r["note_text"]) for r in test])
y_test = [r["reason_category"] for r in test]
acc = clf.score(X_test, y_test)
print(f"\nheld-out accuracy: {acc:.4f}  ({int(acc * len(test))}/{len(test)} correct)")

if acc < 0.60:
    print("WARNING: accuracy below 0.60 — check CSV quality / category balance.")

# ── Prune low-weight features to keep model.json small ───────────────────────
THRESHOLD = 0.05
feature_names = vec.get_feature_names_out()
weights: dict[str, list[float]] = {}
for i, name in enumerate(feature_names):
    col = clf.coef_[:, i]
    if abs(col).max() > THRESHOLD:
        weights[name] = [round(float(v), 6) for v in col]

print(f"Features kept (|w| > {THRESHOLD}): {len(weights)} / {len(feature_names)}")

# ── Write model.json ──────────────────────────────────────────────────────────
model = {
    "classes": list(clf.classes_),
    "intercept": [round(float(v), 6) for v in clf.intercept_],
    "weights": weights,
}
with open("src/extractor/model.json", "w", encoding="utf-8") as f:
    json.dump(model, f, ensure_ascii=False, indent=2)
print("Wrote src/extractor/model.json")

# ── Write fixture (30 test rows) ──────────────────────────────────────────────
fixture = [
    {"note_text": r["note_text"], "reason_category": r["reason_category"]}
    for r in test[:30]
]
with open("src/extractor/model.fixture.json", "w", encoding="utf-8") as f:
    json.dump(fixture, f, ensure_ascii=False, indent=2)
print("Wrote src/extractor/model.fixture.json  (30 fixture rows)")
