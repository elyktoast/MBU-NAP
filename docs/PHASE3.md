# Phase 3: Validate + Intelligence + Scale

Phase 3 starts from the green Phase 2 stable baseline.

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
