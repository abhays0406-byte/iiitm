# DESIGN.md

Reconstructed from the project brief and `src/styles/tokens.css` (the original file was not in the workspace).

## Stack and style
- Plain CSS variables from `src/styles/tokens.css`. No Tailwind, no UI kit.
- Left-aligned, dense, asymmetric spacing. No gradients (except the ruled-line paper background), no glassmorphism, no emoji, no centered hero sections, no three identical cards.
- Spacing is on a 4px grid. Radius is 6px at most. No heavy shadows.
- One icon set: 16px, stroke 1.5, always with a text label nearby.
- Motion: 120ms ease-out, only to confirm an action.

## Type
- UI: IBM Plex Sans. Notes and slips: IBM Plex Serif. Tokens, dates and numbers: IBM Plex Mono with tabular numerals.
- Every stack ends with Noto Sans Devanagari so Hindi renders correctly.

## Colour tokens
- `--ink`, `--ink-2`, `--ink-3` text. `--border` for hairlines. `--border-strong` for control edges (3:1 contrast).
- `--accent` links, progress and focus. `--high` only for the priority dot, a left border and the word "High". `--hold` and `--hold-bg` for needs-review. `--hold-ink` for amber text (AA contrast). `--mark` for the marker-pen highlight.
- Priority is never shown by colour alone. It is always a dot plus the word.

## Date format
- One format everywhere: `26 Nov 2026`.

## Microcopy
- Plain sentences. No exclamation marks.
- Saved: `Saved. Sent to nurse.`
- Empty note: `Write a note first`
- Needs review: `No clear time window in this note.`
- Missing priority: `Priority not tagged. Defaulting to Routine.`
- Non-working day: `Sunday. OPD closed`
- Shared phone lock: `Privacy-safe template. Diagnosis cannot be included.`
- Redaction label: `Hidden by policy`
- Reminder toast: `Reminder approved. Sent (simulated).`
- Audit: `This log is append-only.`
- Empty states: say what is missing and what to do next. Example: `Nothing to review. New notes from the doctor appear here.`
- Loading: `Loading...` as text only. No spinners.
- Error: `Something went wrong. Your changes are saved on this device.`
- Offline: `Offline, N changes queued`

## Focus, keyboard and touch
- Visible focus ring on every control (2px `--accent`, 2px offset).
- Drawers trap focus and close with Esc.
- Touch targets are at least 44px on tablet portrait.
