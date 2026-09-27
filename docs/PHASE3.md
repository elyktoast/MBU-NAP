# Phase 3: Validate + Intelligence + Scale

Phase 3 started from the green Phase 2 stable baseline and is now complete.

## Workstreams

1. Real-world usage validation
2. Adaptive/CAT maturation
3. Advanced admin analytics
4. Content intelligence and maintenance
5. User-experience refinement
6. Production and scale hardening

## Current work: question-level analytics and calibration monitoring

The first Phase 3 capability adds an operator-only, lazy-loaded question analytics workspace.

It reports aggregate item data only, including:

- unique learners;
- correct and incorrect first attempts;
- raw first-attempt accuracy;
- Adaptive first attempts;
- response-time sample count and average;
- calibration difficulty, uncertainty, confidence, and maturity;
- total/open question reports;
- automatic review signals.

Automatic content-review signals stay conservative. Performance alone does not flag an item until it has at least 25 unique learners. Open question reports can flag an item immediately because they represent an explicit content concern.

The admin workspace loads the question index only when requested, so normal learners and normal admin-panel use do not pay the cost of loading 2,000-question metadata.

### Calibration maturity

- 0 learners: unmeasured
- 1–4: collecting
- 5–24: early
- 25–99: preliminary
- 100–299: moderate
- 300+: high

Population calibration must not be treated as mature before the sample supports it.

## Existing-data usage validation

Phase 3 now also summarizes first-attempt usage by study mode from the already-existing private calibration contribution table. No new user/session data is collected for this step.

The operator can see aggregate counts for each mode, including total first attempts, 7-day and 30-day activity, unique contributing accounts, and aggregate accuracy. Raw contribution rows remain unavailable in the admin UI.

## Content intelligence review queue

A deterministic content-review queue now tracks manual-review candidates without rewriting audited source questions. CI verifies that the committed queue matches the current banks.

Current baseline:
- 0 same-set exact duplicate groups;
- 0 cross-bank exact duplicate groups;
- 0 missing source titles;
- 0 missing source locators;
- 0 explanations under 8 words;
- 35 manual-review candidates from exact-stem variants or near-duplicate keyed wording.

These are review candidates, not automatic errors. Any content change still requires source-grounded review.

## Review-next guidance

Study Studio now produces a local-only review recommendation. Due spaced-review work takes priority; otherwise the recommendation points to the weakest topic with at least three cumulative attempts. No new server data is collected for this feature.

## 30-day real-use trend

The operator analytics workspace includes a daily 30-day first-attempt trend built from the existing contribution table. It shows only aggregate daily totals, Adaptive first attempts, aggregate accuracy, and aggregate response-time samples. It does not expose learner identities or raw response rows and does not introduce new telemetry fields.

## CAT calibration readiness

The operator analytics workspace now states whether any items have reached the 25-learner threshold required before population difficulty can affect Adaptive selection. Below that threshold, population difficulty remains inactive and the CAT engine relies on structural item difficulty plus personal learning-priority logic.

## CAT population-data guard

Population difficulty remains completely excluded below 25 unique learners per item. At 25–99 learners it receives a 35% weight, at 100–299 a 60% weight, and at 300+ an 80% weight. CI now tests the 25-learner boundary directly so early data cannot silently become over-weighted.

## Accessibility hardening

Study Studio form controls now use programmatic labels for quiz count and order, and the repository search field has an explicit accessible name. Browser regression coverage scans visible Studio form controls so unlabeled inputs, selects, or textareas fail CI.

## Retention audit visibility

The admin retention-cleanup result now reports resolved question-report deletions alongside sync history, privacy requests, expired legal records, and guest sessions. Browser regression coverage verifies that all retention categories returned by the server are surfaced to the operator.

## Submission abuse controls

Server-side guards protect the two free-text submission workflows without changing the question-report privacy model.

- Suggestions are limited per authenticated account to 10 submissions per 10 minutes and 50 per 24 hours, using the suggestion account identifier that was already stored for that workflow.
- Question reports reject an identical question, reason, and comment submitted again within 5 minutes.
- Question reports also use a conservative global burst ceiling of 100 submissions per 10 minutes.
- The anonymous question-report inbox still does not store the reporter's account identifier.

These controls run inside the database RPCs, so bypassing browser controls does not bypass the limits.

## Report-workflow scale hardening

Private question reports now have targeted indexes for question-level analytics and retention/workflow filtering:

- `question_uid` for grouping/linking report history to analytics;
- `status, updated_at` for workflow ordering and retention cleanup.

The indexes are private database infrastructure and do not expose additional data.

## Stable baseline verification

Phase 3 is considered complete only when the same final commit passes:

- repository architecture validation;
- 2,000-question content integrity;
- semantic content audit;
- performance/architecture budgets;
- question-bank balance analysis;
- deterministic content-review queue validation;
- full browser regression;
- GitHub Pages deployment;
- production migration-history alignment and database-invariant checks.

The production database currently has no orphan admin/sync/access rows and no expired guest, legal, privacy-request, or resolved-question-report records waiting for cleanup. The checked-in migration directory mirrors production migration history.

## Current calibration limitation

Population calibration is still early by design. At the Phase 3 baseline, no item has reached the 25-learner threshold, so population difficulty remains inactive in Adaptive selection. The application will begin using population difficulty automatically only as individual items reach the documented maturity thresholds.

## External Supabase setting

Supabase Security Advisor still reports leaked-password protection as disabled. This is an Auth project setting rather than repository code, and the connected Supabase tools available to this project do not expose a control to enable it. The setting should be enabled in Supabase Auth settings when available; the repository must not claim it is enabled until the advisor confirms it.

## Unified content + performance review queue

The operator question-analytics workspace now merges the deterministic source/content review queue with live aggregate calibration and question-report signals. Unmeasured content candidates remain visible before population data matures, while performance-only alerts still require at least 25 unique learners. The queue never edits audited question content automatically.

## Dedicated admin dashboard

Operator controls now live in a separate Admin Dashboard opened from the signed-in account dashboard. The entry is hidden unless the server confirms the current account is an operator admin, and the dashboard rechecks admin status before mounting. All underlying admin RPCs retain their server-side admin authorization checks. The account dashboard no longer embeds administrative controls.
