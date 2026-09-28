# Quiz Bank Standard

## Canonical source

**Equipment Quiz Bank 1 → Practice Set 1 is Canonical Session v1 for every future standard quiz bank and generated/custom session.**

Canonical session identifier: `equipment-bank1-practice-set1-v1`.

New quiz banks must not copy or fork the runtime. They use the shared canonical renderer/runtime and change only manifest/content fields such as:
- bank title and return label
- number of practice sets
- questions per set
- question data, images, topics, explanations, and citations
- storage key / bank key

Do not create a separate dashboard model, quiz-session model, navigation model, grading model, missed-review model, or control layout for a new bank.

## Dashboard contract

A new quiz bank must follow Bank 1's dashboard pattern:
- dashboard panel with overall completed / total count
- one card per practice set
- question-count line
- completion progress bar
- completed / score / missed summary
- Start Practice Set / Continue Practice Set button
- per-set Review Missed button, disabled when there are no misses
- final Missed Questions Review card built from all practice sets
- Review Missed Questions action
- no dashboard-only Reset button replacing Review Missed

## Quiz-session contract

A new quiz bank must follow Bank 1's active-session pattern:
- same Bank 1 quiz stylesheet and panel structure
- practice-set badge and question progress
- Flag, Report, Navigator, and bank-home controls
- calculator beside Flag
- Completed / Score / Missed stats
- canonical navigator buttons
- stem, optional image, answer options, and cross-out controls
- explicit Submit Answer for single- and multi-select questions
- selected answers remain visible before grading
- after grading, every keyed answer is green and only selected wrong answers are red
- explanation and citation block
- Previous / Reset / Next controls
- correct-answer auto-advance behavior consistent with Bank 1
- final graded Next returns to the bank dashboard
- persistent current position and progress
- missed-question tracking and review behavior
- shared Studio answer/flag/report integration
- shared updater and cache-versioned assets

## Shared behavior

Use the existing shared components instead of creating duplicate implementations:
- `canonical-bank-page.js`
- `quiz-engine.js`
- `bank1-quiz-ui.css`
- `site-nav.js` / `site-nav.css`
- `navigator.js`
- `calculator.js`
- `studio-sync.js`
- `auto-update.js`

## Validation rule

The repository validator automatically applies the Bank 1 contract to newly linked quiz-bank pages on the Exam 1 dashboard. Quiz Bank 2 and Quiz Bank 3 are grandfathered legacy pages; new banks are not.

If a new bank needs behavior that Bank 1 does not have, update Bank 1 first, then propagate that canonical behavior to other banks rather than creating a one-off implementation.


## Hazards architecture

Workstation Hazards is part of the same central Exam 1 architecture and must be represented in `equipment/exam-1/banks.json` and canonical external data. Hazards keeps its specialized shared engines because its review and challenge behavior differs from the standard quiz-bank engine, but Hazards question payloads and shared figures must not be embedded back into the HTML pages.

Canonical Hazards sources:
- `equipment/exam-1/data/hazards.json` for all 350 Hazards questions
- `equipment/exam-1/data/hazards-images.json` for shared Hazards figures
- `hazards-standard-engine.js` for Practice Sets 1–2
- `hazards-quiz-engine.js` for Practice Set 3 and Challenge

Studio, global navigation, and the Exam 1 dashboard must obtain Hazards metadata from `banks.json` rather than maintaining a separate hard-coded Hazards catalog.

## Content-only bank rule

For future courses, a bank is a manifest entry plus canonical question JSON and optional images. The standard session environment is selected by `sessionEnvironment: "equipment-bank1-practice-set1-v1"` and `engine: "canonical"`. A future standard bank must not introduce its own HTML quiz shell, grading handler, navigation handler, or CSS variant.

A course may expose one generic `bank.html?bank=<id>` page. The shared canonical renderer resolves the bank ID from the URL and loads that course/exam's manifest through `MBU_CONTEXT.examUrl`.

Studio, Smart Review, missed review, and Adaptive/CAT sessions must retain the same learner-facing answer-selection, submit, grading, explanation, cross-out, navigator, notes, report, and navigation conventions as Canonical Session v1. Session selection logic may differ; the quiz interaction environment does not.
