# Content quality audit

Last reviewed: 2026-09-26

## Scope

The automated content audit covers the five canonical question sources:

- Quiz Bank 1: 500 questions
- Quiz Bank 2: 500 questions
- Quiz Bank 3: 500 questions
- Combined: 150 questions
- Workstation Hazards: 350 questions

Total canonical questions reviewed structurally: **2,000**.

## Release-blocking checks

CI now fails when a canonical question has:

- a missing stem;
- an invalid or duplicate question ID within a set;
- fewer than two answer choices;
- blank or duplicated answer choices;
- an invalid or repeated keyed answer index;
- a type other than `single` or `multi`;
- an answer-count/type mismatch;
- no citation/source text;
- no explanation/rationale;
- an unsafe image identifier;
- an unexpected question count;
- a new same-set duplicate stem that is not in the approved baseline.

Known duplicate entries are now actually consumed by the validator. Adding a new duplicate stem requires an explicit baseline decision instead of silently becoming another warning.

## Current findings

### Citations and explanations

All 1,950 canonical questions currently contain citation/source text and an explanation/rationale.

### Topics

Bank 1 predates the later topic metadata model and all 500 Bank 1 questions currently lack an explicit topic field. This is recorded as a known baseline so the condition cannot worsen without failing CI. Banks 2, 3, Combined, and Hazards currently have explicit topic metadata.

This does not affect grading or quiz behavior. It mainly limits topic-based filtering/analytics for Bank 1.

### Duplicate stems

Bank 1 contains 21 known same-set duplicate stems. These are explicitly baselined and can no longer expand unnoticed.

Workstation Hazards Set 2 contains 65 known duplicate occurrences. Questions 31–100 repeat five additional questions in a cycle. Repository history confirms this repetition existed in the original Set 2 implementation before the canonical-data migration, so it is a source-content limitation rather than a migration defect.

The application keeps these entries for compatibility with the existing 100-question set and saved progress. They should only be replaced when authoritative source material is available; replacement questions should not be invented merely to satisfy a count.

## Semantic audit\n\nThe quality gate also runs a deterministic semantic audit across all 2,000 questions. It detects exact duplicate stems across sets, fails when the same stem and same answer-choice pool are keyed inconsistently, warns when an exact stem is reused with materially different option/key wording, screens for high-similarity near-duplicates, and explicitly reports the known repetitive Hazards Set 2 source content.\n\nThis audit is intentionally deterministic and does not require a paid AI service.\n\n## Semantic limitations

Automated validation can prove structural consistency but cannot independently prove that every anesthesia answer is clinically correct or that every cited slide supports every rationale. A true semantic review still requires comparison against the authoritative lecture/source material.

Until those source materials are available in the repository, the release gate focuses on preventing structural regressions and making known content debt explicit.
