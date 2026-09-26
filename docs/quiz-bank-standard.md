# Quiz Bank Standard

## Canonical source

**Quiz Bank 1 (`equipment/exam-1/quiz-bank-1.html`) is the canonical model for every new quiz bank.**

New quiz banks must copy Bank 1's behavior and structure first, then change only bank-specific content such as:
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
- `bank1-quiz-ui.css`
- `site-nav.js` / `site-nav.css`
- `navigator.js`
- `calculator.js`
- `studio-sync.js`
- `auto-update.js`

## Validation rule

The repository validator automatically applies the Bank 1 contract to newly linked quiz-bank pages on the Exam 1 dashboard. Quiz Bank 2 and Quiz Bank 3 are grandfathered legacy pages; new banks are not.

If a new bank needs behavior that Bank 1 does not have, update Bank 1 first, then propagate that canonical behavior to other banks rather than creating a one-off implementation.
