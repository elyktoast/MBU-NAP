# Phase 2: Improve + Expand

Phase 2 started from the green Phase 1 stable baseline and is now complete.

## Completed work

### Whole-bank quality analysis

`npm run analyze:questions` now reports the 2,000-question system as a whole, including:

- question counts by bank and set;
- single-select versus multi-select mix;
- topic and source distribution;
- source-metadata completeness;
- source and displayed answer-position distribution;
- option-count and image coverage;
- explanation-length distribution;
- exact duplicate stems, including same-set, cross-set, and cross-bank reuse.

The analysis remains descriptive rather than enforcing arbitrary content-balance thresholds.

### Answer-position cue removal

Correct answers are displayed in a deterministic balanced order while canonical option indexes remain unchanged for grading, persistence, reports, source auditing, and cloud sync. This removed the strong A-position bias that existed in Bank 1 and Hazards without rewriting audited question content.

### Duplicate/repetition control

The audit identified 144 exact duplicate-stem groups. They are cross-set repeats within Banks 1–3, with no same-set or cross-bank exact duplicates.

Canonical practice sets remain unchanged. Study Studio and Adaptive sessions collapse or avoid duplicate content so users are not unnecessarily served the same stem twice when sources/sets are mixed.

### Adaptive model refinement

- Adaptive avoids recently seen duplicate-content variants across sessions.
- Previously attempted questions receive a small exposure penalty when equally appropriate unseen items are available.
- Item difficulty is separated from personal weakness. Personal performance affects selection priority, while item difficulty remains based on item structure and sufficiently mature population calibration.
- Population difficulty remains conservative until an item reaches at least 25 unique learners.

### Calibration/admin visibility

The restricted admin dashboard now exposes calibration maturity, including:

- items with any calibration data;
- items with at least 2, 5, and 25 unique learners;
- maximum learners per item;
- total first-attempt contributions;
- CAT users and Adaptive first attempts.

### Private question-report workflow

Question reporting moved from the retired Google Apps Script/Sheet path to a private Supabase inbox.

- Submission requires an authenticated active account.
- Reporter identity/email is not stored in the report row.
- Full question/source/build context is retained for review.
- Admin can mark reports new, reviewing, fixed, or declined.
- Reports link directly to the exact Study Studio question.
- Resolved reports have a two-year target cleanup window.
- The obsolete Apps Script backend was removed and validation prevents its return.

### Study Studio improvements

- Mixed sessions collapse exact duplicate stems.
- Weak Areas now uses cumulative Study Intelligence history instead of only the latest answer snapshot.
- Weak-topic questions are ranked by review priority.
- Weak Areas persists as its own resumable session mode.
- Completed sessions preserve a last-session summary with accuracy, answered/correct/missed totals, session mode, and weakest topics.

### Startup/performance improvements

- Universal Search is lazy-loaded only when opened, removing about 6.5 KB from ordinary page startup.
- The disabled/unconfigured question-generator framework is no longer downloaded during normal Studio startup and loads only when the feature is enabled.
- Existing architecture/performance budgets were preserved rather than raised to accommodate new code.

### Production/backend consistency

At the Phase 2 baseline:

- GitHub and production Supabase migration histories match exactly;
- only the `main` branch remains;
- restore history is capped at 10 versions per user/store key;
- orphan account/admin/sync records are zero;
- guest-session and resolved-report retention checks are clean;
- current legal contract is v6 and existing accounts must re-accept it on their next authenticated use;
- leaked-password protection remains the one project-level Supabase Auth setting that must be enabled outside the connected repository/database actions.

## Verification

The Phase 2 stable baseline requires all of the following to be green on the same commit:

- repository architecture validation;
- question content integrity;
- semantic content audit;
- performance/architecture budgets;
- whole-bank analysis;
- full Playwright browser regression;
- GitHub Pages deployment.
