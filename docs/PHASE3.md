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
