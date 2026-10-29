# RULES.md

Reconstructed from the project brief (the original file was not in the workspace). These ten hard rules override any other instruction. `src/rules.test.ts` checks each one against the running system.

1. **The extractor only proposes.** A nurse must approve before any date is Approved. A Needs-Review note never receives an AI date. A Needs-Review visit cannot be approved until a nurse has set a date.
2. **Urgency comes only from the doctor's tag** (High or Routine). No scores, weights, risk or ML. A missing tag is treated as Routine and shown with a visible flag.
3. **The queue sort is deterministic:** doctor priority (High first), then days overdue descending, then token ascending. No household grouping.
4. **Nothing is sent automatically.** All outreach is simulated and needs an explicit staff click.
5. **Shared phone means the neutral template only:** `Reminder: District Hospital check-up scheduled for Token #[ID]. Please carry your OPD slip.` It never contains a diagnosis, department, specialty or reason.
6. **Records Desk never receives `note_text` or `reason_category`.** This is enforced in the selector layer, not only in the UI.
7. **Every mutating action appends an audit entry** (actor, role, action, entity, before, after, simulated timestamp). The audit log is append-only.
8. **All dates come from the simulated clock** (`now` in the clock store). No `new Date()` or `Date.now()` in domain, engine, extractor or seed code.
9. **No unlisted features.** Household bundling and date snapping are not in V1. A date is never changed automatically.
10. **Seed CSV labels are never edited, and no measured number is hard-coded.** Benchmarks are measured at runtime.
