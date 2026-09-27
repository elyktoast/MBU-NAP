# Content quality audit

Last reviewed: 2026-09-27

## Scope

The audit covers all five canonical question sources:

- Quiz Bank 1: 500 questions
- Quiz Bank 2: 500 questions
- Quiz Bank 3: 500 questions
- Combined: 150 questions
- Workstation Hazards: 350 questions

Total canonical questions: **2,000**.

## Phase 1: audit findings

Phase 1 was read-only. No question stem, answer choice, answer key, explanation, or citation text was changed as part of the audit.

### Structural integrity

All 2,000 questions currently have:

- a question stem;
- at least two nonblank answer choices;
- valid keyed answer indexes;
- a valid single- or multiple-answer type;
- an explanation/rationale;
- citation/source text;
- canonical topic metadata;
- canonical source-title metadata.

The release gate continues to validate IDs, set counts, answer indexes, duplicate answer choices, image references, question types, and the approved duplicate baseline.

### Duplicate and repetition findings

There are **no exact-stem duplicate groups shared between different canonical bank files**.

Within individual banks:

| Bank | Exact repeated-stem occurrences across the whole bank | Same-set duplicates already baselined |
| --- | ---: | ---: |
| Quiz Bank 1 | 155 | 21 |
| Quiz Bank 2 | 39 | 0 |
| Quiz Bank 3 | 34 | 0 |
| Combined | 0 | 0 |
| Workstation Hazards | 65 | 65 |

The whole-bank counts include questions intentionally repeated in different practice sets, so they are review flags rather than automatic errors.

Bank 1 contains **11 exact-stem groups where the keyed answer wording differs because the option pools differ**. There are **zero** cases where the same stem and the same answer-choice pool are keyed inconsistently. These 11 groups remain candidates for Phase 3 source review, not automatic key changes.

Workstation Hazards Set 2 still contains the previously documented repetitive source content: questions 31–100 cycle repeated questions from the original source implementation. This remains content debt for Phase 5 and is not being replaced without authoritative source material.

### Explanation-quality review flags

A short explanation is not automatically poor, but explanations under 80 characters were flagged for later manual review:

| Bank | Explanations under 80 characters |
| --- | ---: |
| Quiz Bank 1 | 11 |
| Quiz Bank 2 | 79 |
| Quiz Bank 3 | 0 |
| Combined | 12 |
| Workstation Hazards | 12 |

A separate distractor heuristic flagged questions where the keyed answer is substantially longer than the other choices:

| Bank | Long-keyed-answer heuristic flags |
| --- | ---: |
| Quiz Bank 1 | 10 |
| Quiz Bank 2 | 9 |
| Quiz Bank 3 | 2 |
| Combined | 2 |
| Workstation Hazards | 10 |

These are review queues for Phase 4. They are not treated as content errors.

## Phase 2: metadata normalization

Phase 2 changed metadata only. Question wording, answer choices, answer keys, and explanations were preserved. Citation display strings were normalized to a consistent `Source · locator` format while retaining the underlying source/locator information.

### Canonical topics

The shared topic taxonomy is now:

- **Monitoring**
- **Medical Gases**
- **CO₂ & Scavenging**
- **Airway**
- **Hazards & Safety**

Bank 1 now has complete topic metadata derived from its source citations:

| Bank 1 topic | Questions |
| --- | ---: |
| Medical Gases | 181 |
| Monitoring | 180 |
| CO₂ & Scavenging | 85 |
| Airway | 54 |

The other banks were normalized to the same vocabulary, eliminating variations such as `Medical Gas`, `Medical gases`, `CO2 & scavenging`, `Workstation Hazards`, and `Hazards & safety`.

### Canonical source metadata

Every question now carries normalized `sourceTitle`, `sourceLocator`, and `sourceMeta` fields alongside the normalized display citation.

The allowed source titles are:

- **Intraoperative Assessment, Monitoring & Data Interpretation**
- **Medical Gas Systems in Anesthesia**
- **CO₂ Absorbents and Scavenging**
- **Airway Equipment**
- **Anesthesia Workstation Hazards & Safety**
- **SRNA Equipment Study Guide**
- **Exam 1 Study Guide**
- **Exam 1 Basics Study Guide**
- **Exam 1 Equipment Study Guide**

This gives Search, analytics, future source verification, and semantic audits a stable source field without rewriting citations.

### Citation formatting

Citation display strings were normalized into a consistent `Source · locator` form. The underlying slide/PDF-page locator information was retained in `sourceLocator` and `sourceMeta`, so normalization did not discard source traceability.

This removes legacy variations such as `.pdf · 12`, `Slides 12, 13`, and mixed lecture-title styles while keeping the actual source-location information available for Search, audits, and later source verification.

### Difficulty metadata

Static Easy/Moderate/Hard labels were intentionally not assigned in Phase 2. There is no authoritative difficulty source in the canonical content, and guessing difficulty would create subjective metadata. MBU-NAP already has real performance data that can support an empirical difficulty model later if desired.

## Content-quality scorecard after Phases 1–2

| Area | Status |
| --- | --- |
| 2,000 canonical questions structurally valid | **Complete** |
| Missing topics | **0** |
| Missing canonical source titles | **0** |
| Missing citations | **0** |
| Missing explanations | **0** |
| Shared topic vocabulary | **Complete** |
| Shared source-title vocabulary | **Complete** |
| Same option pool + conflicting keyed answer | **0 found** |
| Bank 1 same-set duplicate baseline | **21 known** |
| Hazards Set 2 repeated-source debt | **65 repeated occurrences** |
| Short-explanation review queue | **114 questions** |
| Long-keyed-answer heuristic queue | **33 questions** |
| Static difficulty labels | **Intentionally not assigned** |

## Automated release gates

CI now fails when canonical content has:

- a missing stem;
- an invalid or duplicate question ID within a set;
- fewer than two answer choices;
- blank or duplicated answer choices;
- an invalid or repeated keyed answer index;
- a type other than `single` or `multi`;
- an answer-count/type mismatch;
- no citation/source text;
- no explanation/rationale;
- a missing or noncanonical topic;
- a missing or noncanonical `sourceTitle`;
- an unsafe image identifier;
- an unexpected question count;
- a new same-set duplicate stem that is not in the approved baseline;
- an exact repeated stem with the same answer-choice pool but conflicting keyed answers.

The deterministic semantic audit requires no paid AI service.

## Next phases

Phase 3 is the source-verified duplicate/contradiction cleanup. It should not change answer keys unless the authoritative lecture/source material supports the correction.

Phase 4 is question-quality refinement: explanation quality, distractors, ambiguous wording, answer-choice clues, units, and abbreviations.

Phase 5 is coverage/rebuild work, especially replacing repetitive Hazards Set 2 content from authoritative material and balancing topic coverage.

## Phase 3–5: source-grounded content rebuild

Completed: 2026-09-27

### Source basis

Changes in this phase were grounded in the two study guides supplied for Exam 1:

- **SRNA Equipment Study Guide** for medical gases/anesthesia machine, CO₂ absorbents and scavenging, airway equipment, workstation hazards, electricity, electrosurgery, power failure, and fire safety.
- **Exam 1 Study Guide** for monitoring, airway pressures/loops, capnography, and ASA/AANA monitoring concepts.

No unsupported outside clinical material was used to rewrite the 86 replacement questions. Existing unchanged questions retain their pre-existing lecture citations.

### Phase 3: duplicate and correctness cleanup

**Quiz Bank 1**
- Replaced all **21** previously baselined same-set duplicate occurrences with unique source-grounded questions.
- Preserved the original question IDs and set locations so saved progress remains compatible.
- Bank 1 now has **zero same-set exact duplicate stems**.

**Workstation Hazards**
- Rebuilt the **65** repeated Set 2 slots, questions 36–100.
- Hazards Set 2 now contains **100/100 unique normalized stems**.
- The full Hazards bank now contains **350 unique exact stems**.

Across all five canonical sources:
- **0** same-set exact duplicate groups remain.
- **0** same-stem + same-option-pool conflicting answer keys remain.
- **0** required content fields are missing.

### Phase 4: question-quality refinement

The 2,000-question corpus was rescanned for short explanations and answer-length clues after the rebuild.

The short-explanation and long-keyed-answer checks are treated as **review heuristics**, not automatic errors. Many concise explanations are already complete, and a correct response can legitimately require more specificity than distractors.

Changes were made where the newly rebuilt questions created an obvious answer-length clue. Distractors were balanced without changing the keyed concept. No answer key was changed merely because a heuristic fired.

Final heuristic queue:
- short-explanation heuristic: **94**
- long-keyed-answer heuristic: **34**

Those counts are retained in the machine-readable audit so future content work can review them without pretending they are proven defects.

### Phase 5: coverage and Hazards rebuild

The former repetitive Hazards Set 2 debt has been removed. The rebuilt set now samples the actual supplied equipment material across:
- risk management and machine-check failures;
- upstream hypoxemia and hypercarbia hazards;
- Mapleson circuits, occlusion, high pressure, and disconnections;
- electrical principles, grounding, electrosurgery, and power failure;
- operating-room fire prevention and response;
- pipeline/cylinder pressure relationships, fail-safe behavior, oxygen flush, PISS, vaporizers, and common gas outlet;
- absorbent mesh/capacity, waste-gas limits, scavenging effectiveness, and room ventilation.

This broadens the set without changing its 100-question size or its saved-progress identifiers.

### Final content-quality scorecard

| Measure | Final status |
| --- | --- |
| Canonical questions | **2,000** |
| Source-grounded replacement questions | **86** |
| Bank 1 same-set duplicates replaced | **21** |
| Hazards Set 2 repeated slots rebuilt | **65** |
| Same-set exact duplicate groups | **0** |
| Hazards Set 2 unique stems | **100 / 100** |
| Same stem + same option pool with conflicting key | **0** |
| Missing required fields | **0** |
| Invalid answer indexes/type mismatches | **0** |
| Missing topic metadata | **0** |
| Missing source metadata | **0** |

The final machine-readable result is stored in `reports/content-phase3-5-audit.json`.

### Remaining deliberate limitations

- Exact stems can still recur in **different** practice sets when intentionally retained as repeated exposure. They are not treated as a same-set defect.
- Static Easy/Moderate/Hard labels remain intentionally absent because no authoritative difficulty rubric was supplied.
- Heuristic review queues remain visible for future refinement, but they are not release-blocking unless a concrete content error is identified.

