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

### Source hierarchy

Content changes in this phase were grounded in the course materials rather than generated from unsupported general knowledge.

Primary course sources:
- Exam 1 Equipment Study Guide, covering medical gases/anesthesia machine, CO₂ absorbents and scavenging, airway equipment, workstation hazards, electricity, electrosurgery, and fire safety.
- Exam 1 Basics Study Guide, especially the intraoperative monitoring section used for capnography, airway pressures/loops, ECG, noninvasive blood pressure, and arterial-line concepts.

Secondary confirmation source:
- Elisha, Heiner, and Nagelhout, *Nurse Anesthesia*, especially Chapter 16, Anesthesia Equipment, plus the clinical-monitoring material. The textbook was used to confirm machine-organization, pipeline/cylinder behavior, low-pressure-system safety, absorbent/capnography concepts, and monitoring principles when a course-guide statement needed confirmation.

Course material remained the controlling source when its exam emphasis or lecture-specific wording differed from broader textbook presentation.

### Phase 3: duplicate and correctness cleanup

Quiz Bank 1:
- Replaced all 21 previously baselined same-set duplicate occurrences with unique source-grounded questions.
- Preserved all question IDs and set sizes so saved-progress compatibility remains intact.
- Bank 1 now contains zero same-set duplicate stems.

Workstation Hazards:
- Replaced the 65 repeated Set 2 slots (questions 36–100) with 65 unique questions derived from the Equipment Study Guide.
- Hazards Set 2 now contains 100 unique normalized stems.
- Corrected the closed-claims/incidence item: 115 of about 6,000 is approximately 1.9% of the cited closed claims, while 0.23%–0.4% is the separately reported estimated event incidence. Those figures are no longer conflated.

The approved duplicate baseline for Bank 1 and Hazards is now empty.

### Phase 4: question-quality refinement

All 2,000 canonical questions were rescanned for:
- missing stems, options, answer keys, explanations, citations, topics, and source metadata;
- duplicate choices;
- same-set duplicate stems;
- very short explanations;
- keyed-answer length clues;
- invalid answer indexes and single/multiple-answer mismatches.

Results:
- zero missing required content fields;
- zero same-set duplicate stems;
- zero structural answer-key errors;
- zero true duplicate answer-choice errors;
- two genuinely underdeveloped explanations were expanded without changing their stems, choices, or keys.

The keyed-answer-length heuristic still flags some items where the correct response is naturally more specific than distractors. Those were retained when the wording remained clinically coherent; the heuristic is not treated as proof of a bad question.

### Phase 5: coverage and Hazards rebuild

The former repetitive Hazards Set 2 source debt has been removed. The rebuilt set samples:
- cylinder contents, indexing, pipeline/cylinder pressure relationships, and fail-safe limitations;
- flowmeters, oxygen flush, vaporizers, common gas outlet, and leak testing;
- carbon dioxide absorbent chemistry, channeling, degradation products, exposure limits, and scavenging;
- mask ventilation, airway adjuncts, positioning, laryngoscope blades, specialty tubes, laser-airway fire risk, and front-of-neck access;
- risk management, workstation electrical supply, electrosurgery, power failure, and operating-room fire management.

This broadens the set while staying inside the actual Exam 1 Equipment Study Guide content.

### Final content-quality scorecard

| Measure | Final status |
| --- | --- |
| Canonical questions | 2,000 |
| Missing topic metadata | 0 |
| Missing source metadata | 0 |
| Same-set duplicate stems | 0 |
| Repetitive Hazards Set 2 slots | 0 |
| Same stem + same option pool with conflicting keyed answer | 0 |
| Invalid answer indexes/type mismatches | 0 |
| Missing explanations/citations | 0 |
| Source-grounded replacement questions | 86 (21 Bank 1 + 65 Hazards) |
| Known closed-claims statistic conflation | Corrected |

### Remaining deliberate limitations

- Exact stems can still recur in different practice sets when they are intentionally retained as spaced/repeated exposure; this is not a same-set duplication defect.
- Static Easy/Moderate/Hard labels remain intentionally absent because no authoritative difficulty source exists. User-performance data is a stronger basis for adaptive difficulty.
- Automated checks cannot independently prove every clinical claim. The source hierarchy above is therefore preserved for future manual review and any disputed item should be resolved against the cited course material first, then the textbook.

