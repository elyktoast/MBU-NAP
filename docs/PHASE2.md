# Phase 2: Improve + Expand

Phase 2 begins from the green Phase 1 stable baseline.

## First workstream: question-bank system analysis

The first Phase 2 task is a repeatable whole-bank analysis rather than another question-by-question audit. The repository now measures:

- question counts by bank and set;
- single-select versus multi-select mix;
- topic distribution;
- source distribution and source-metadata completeness;
- answer-position distribution for single-best-answer questions;
- option-count distribution;
- image-question coverage;
- explanation-length distribution;
- exact duplicate stems and cross-bank duplicate reuse.

Run:

```bash
npm run analyze:questions
```

The analysis is intentionally descriptive at first. It does not fail CI on arbitrary balance thresholds. We will use the measured baseline, plus live Supabase calibration data, to choose targeted improvements before converting any metric into a release gate.

## Phase 2 sequence

1. Measure question-bank balance and calibration coverage.
2. Correct meaningful systemic imbalances or repeated-content patterns.
3. Improve CAT/adaptive calibration and selection using real aggregate data.
4. Improve admin analytics and report/suggestion workflows.
5. Improve Study Studio session building and performance based on observed use.
6. Expand content/features only after the existing system remains green.
