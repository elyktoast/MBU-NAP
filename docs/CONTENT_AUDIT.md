# Content quality audit

Last reviewed: 2026-09-26

## Scope

Phase 1 audited all **2,000 canonical questions** without changing question content. Phase 2 normalized metadata only.

| Bank | Questions | Topics after normalization | Short explanations <80 chars | Long-correct-choice flags |
| --- | ---: | --- | ---: | ---: |
| Quiz Bank 1 | 500 | Medical Gases 181; Monitoring 180; CO₂ & Scavenging 85; Airway 54 | 11 | 10 |
| Quiz Bank 2 | 500 | Monitoring 130; Medical Gases 128; CO₂ & Scavenging 122; Airway 120 | 79 | 9 |
| Quiz Bank 3 | 500 | Monitoring 226; Medical Gases 144; CO₂ & Scavenging 84; Airway 46 | 0 | 2 |
| Combined | 150 | Hazards & Safety 58; Medical Gases 52; CO₂ & Scavenging 23; Airway 17 | 12 | 2 |
| Workstation Hazards | 350 | Hazards & Safety 350 | 12 | 10 |

## Phase 1 findings

- 151 exact normalized-stem reuse groups exist within the canonical content.
- No exact normalized stem is duplicated across different banks.
- No identical-stem + identical-option-pool group currently has conflicting keyed answers.
- 35 high-similarity near-duplicate pairs were identified for later human review.
- 114 explanations are shorter than 80 characters; only 2 are shorter than 40 characters.
- 33 questions have a correct choice that is substantially longer than the average distractor and should be reviewed for answer-length clues.
- Hazards Set 2 remains the largest known repetition problem: 65 duplicate occurrences are explicitly baselined.
- Bank 1 contains 21 known same-set duplicate occurrences already tracked by the integrity baseline.
- No canonical question is missing a citation or explanation.

These are audit flags, not automatic proof that a question is bad. Phase 3 should verify flagged items against authoritative source material before changing keys or deleting questions.

## Phase 2 metadata normalization

Phase 2 made **metadata-only changes**. A field-by-field comparison against build `2026-09-26-stabilization-v111` confirmed:

- 0 question stems changed;
- 0 answer-choice sets changed;
- 0 keyed answers changed;
- 0 explanations changed;
- question counts remained 500 / 500 / 500 / 150 / 350.

### Topics

All 2,000 questions now have an explicit canonical topic. The allowed vocabulary is:

- Monitoring
- Medical Gases
- CO₂ & Scavenging
- Airway
- Hazards & Safety

Bank 1 is now fully tagged rather than relying on its legacy source-only classification.

### Structured sources

Every question now has:

- `sourceTitle`
- `sourceLocator`
- `sourceMeta` with canonical source family and slide/PDF locator data when available

Citation display text was normalized to a consistent `Source · locator` form while preserving the original slide/page locator information. Structured source metadata gives Search, auditing, and future generated-question/source verification stable fields without changing educational content.

### Difficulty

Difficulty labels were intentionally **not invented** from wording alone. Future difficulty metadata should be based on either authoritative faculty/source labeling or observed aggregate performance rather than subjective automatic guesses.

## Release-blocking checks

CI fails for missing stems, invalid IDs, invalid answer choices or indexes, missing citations, missing explanations, missing topics, missing structured source metadata, unsafe image IDs, unexpected counts, or new unapproved same-set duplicates.

The semantic audit additionally detects exact duplicate reuse, same-option-pool answer-key conflicts, high-similarity near duplicates, and known Hazards repetition.

## Next content phase

Phase 3 should focus on source-verified correctness:

1. review Bank 1 known same-set duplicates;
2. review the 35 near-duplicate pairs;
3. review the 33 answer-length-clue flags;
4. verify the two very short explanations;
5. resolve Hazards Set 2 repetition only from authoritative material.
