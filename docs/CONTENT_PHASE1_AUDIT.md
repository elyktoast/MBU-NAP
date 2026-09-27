# Phase 1 Content Audit

Reviewed: 2026-09-26

## Scope

This audit reviewed all **2,000 canonical questions** without changing question stems, answer choices, answer keys, or explanations.

The detailed machine-readable findings are stored in `reports/content-phase1-audit.json`.

## Key findings

- Exact duplicate-stem groups: **151**
- High-similarity near-duplicate pairs (≥0.90 token similarity): **35**
- Confirmed exact-stem + same-choice-pool conflicting answer keys: **0**
- Hazards Set 2: **100 questions, 35 unique normalized stems, 65 repeated occurrences**
- Missing topic metadata after Phase 2 normalization: **0**
- Legacy citation-format findings after normalization: **0**

## Explanation screening

Questions with explanations shorter than 80 characters are review candidates, not automatically bad questions:

- bank1.json: **11**
- bank2.json: **79**
- bank3.json: **0**
- combined.json: **12**
- hazards.json: **12**

## Distractor screening

The audit flags single-answer questions where the keyed answer is much longer than the average distractor. This is only a review signal because a longer correct answer may be clinically appropriate:

- bank1.json: **10**
- bank2.json: **9**
- bank3.json: **2**
- combined.json: **2**
- hazards.json: **10**

## Duplicate interpretation

The audit found **no confirmed answer-key conflict where an exact duplicate stem uses the same answer-choice pool but keys a different answer**.

There are many repeated and near-repeated concepts, particularly in Bank 1 and Hazards. These remain content-review candidates for later phases rather than being automatically deleted or rewritten.

## Hazards Set 2

Set 2 remains the largest known repetition problem. It contains **35 unique normalized stems across 100 slots**, leaving **65 repeated occurrences**. Repository history shows this repetition predates the canonical-data migration. It should be rebuilt only from authoritative source material.

## Metadata findings

Phase 2 resolved the major metadata gap. All questions now use the canonical topic taxonomy:

- Monitoring
- Medical Gases
- CO₂ & Scavenging
- Airway
- Hazards & Safety

Bank 1's 500 questions were classified from their existing source metadata and citation families without changing question content or answer keys.

Citations were normalized to a consistent `Source · locator` presentation while preserving the underlying source and locator information in structured metadata. Every canonical question also now carries `sourceMeta`, `sourceTitle`, and `sourceLocator`; the audit found **0 structured-source metadata gaps**.

## Difficulty metadata

Difficulty labels were **not** added. Without an authoritative difficulty rubric or empirical performance threshold, labeling questions Easy/Moderate/Hard would create invented metadata. Existing and future response history can support evidence-based item difficulty later.

## Phase 1 conclusion

The dataset is structurally strong enough for continued use. The main content-quality work remaining for later phases is:

1. duplicate and near-duplicate consolidation;
2. Hazards Set 2 rebuilding;
3. review of short explanations;
4. review of distractors that may cue the correct answer;
5. source-level verification of any suspected clinical contradiction before changing an answer key.
