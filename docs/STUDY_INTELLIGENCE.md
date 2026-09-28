# Study intelligence

## Purpose

`equipment/assets/study-intelligence.js` is the single cross-runtime source of truth for learning history. Quiz Bank 1–3, Combined, Workstation Hazards, and Study Studio all record completed answers through the same API.

It owns:

- cumulative attempts and accuracy;
- current correct/incorrect state and streak;
- spaced-review due dates;
- Smart Review ranking;
- recent activity;
- 7-day and 30-day summaries;
- bank and topic analytics;
- personal mastery estimates and confidence;
- per-question learning priority used by Smart Review and Adaptive 2.0;
- synchronized question-issue metadata.

It does **not** replace each quiz runtime's native progress state. Native save formats remain authoritative for resuming an individual quiz. Study intelligence adds a normalized learning layer across those formats.

## Storage

Local/cloud store:

`mbu_study_intelligence_v1`

The store participates in the normal SRNA Study Tool local-first backup and Supabase sync envelope.

Activity is intentionally capped so long-term use does not create an unbounded browser save.

## Spaced review

Current intervals are deliberately simple:

- incorrect answer → due in 1 day;
- first correct streak → 3 days;
- second consecutive correct → 7 days;
- third consecutive correct → 14 days;
- longer correct streaks → 30 days.

An incorrect answer resets the streak.

Due Review is sorted by actual due time, oldest overdue first.

## Personal mastery

Personal mastery is derived from the existing synchronized learning history. It does not create a second learner-state store.

For each topic, the model combines:

- lifetime answer performance with conservative smoothing;
- the most recent answer window;
- number of attempts;
- number of unique questions practiced;
- time since the most recent attempt.

The displayed mastery percentage is a study estimate, not a certification-exam score or pass prediction. Confidence rises as evidence and breadth increase and decays gradually when practice becomes stale. The model also reports a recent trend by comparing the newer half of the recent answer window with the older half.

## Smart Review

Smart Review and Adaptive 2.0 share one question-priority function. Priority increases for:

- currently due questions;
- the last answer being incorrect;
- weak-topic mastery when there is enough evidence;
- repeated misses;
- stale previously attempted questions;
- unseen questions that improve coverage.

Questions with no learning history remain eligible. Equal-priority questions use a deterministic UID hash as a tie-breaker so a cold-start review is distributed across the loaded repository instead of defaulting to the first bank.

Smart Review currently selects up to 50 questions.


## Testing and calibration privacy commitment

SNAR Study Tool may collect question-performance data from authenticated users for testing, validation, question-quality improvement, and Adaptive Mode calibration. The testing/calibration dataset does not contain names, email addresses, passwords, or device identity and is not used for advertising or sold.

The system maintains only the minimum private account-linked first-attempt record needed to prevent duplicate statistical contributions. User-facing population calibration data is de-identified and aggregated. SNAR Study Tool will not attempt to re-identify de-identified testing data.

Account authentication and private progress synchronization necessarily use account information separately from the testing/calibration dataset.

## Adaptive Mode

Adaptive Mode is deliberately separate from Smart Review and from normal quiz sessions. Normal study tools remain available without an account. Adaptive Mode requires a signed-in SNAR Study Tool account and runs only when the user enables the **Adaptive Mode** toggle while building a custom session.

The implementation follows CAT principles used by major credentialing examinations without claiming formal psychometric equivalence:

- ability is represented internally on a continuous provisional logit-like scale;
- the ability estimate is recalculated from the full adaptive-session response path after every answer;
- candidate difficulty is based on item structure plus population calibration only after the existing minimum-cohort gate is met;
- personal weakness never changes an item's difficulty estimate;
- item selection still favors questions near an estimated 50% success probability for information around the current provisional ability estimate;
- after the initial diagnostic questions, selection increasingly incorporates the shared learning-priority score for due review, weak-topic mastery, repeated misses, stale material, and new coverage;
- source/topic representation is balanced against the distribution of the user-selected question pool;
- questions already used in the current adaptive session are excluded;
- recently seen questions and duplicate-content variants receive exposure penalties when alternatives are available;
- the selected focus reason is retained in adaptive session state so the UI can explain why a question was chosen;
- the visible Challenge 1–5 indicator is only a friendly display mapped from the continuous internal estimate.

The engine starts at the midpoint with a regularizing prior so one early answer cannot drive the estimate to an extreme. Precision improves as information accumulates.

Structural difficulty values remain provisional, and population calibration is used only when an item reaches the configured cohort threshold. The feature does not claim psychometric equivalence to a validated high-stakes CAT.

Adaptive sessions are forward-only. Normal custom sessions, Smart Review, Due Review, Missed Review, and Flagged Review remain non-adaptive unless Adaptive Mode is explicitly enabled.

## Legacy progress

When Study Studio loads, it first reconciles existing quiz-bank progress into the Studio compatibility layer and then seeds study intelligence once. This lets existing progress participate without changing or rewriting the original bank saves.

Legacy migration is intentionally conservative: it establishes the latest known result but does not invent historical attempt timestamps.

## Analytics

The shared summary exposes:

- total attempts;
- cumulative accuracy;
- last 7 days;
- last 30 days;
- today's activity;
- number of topics practiced today;
- questions due for review;
- performance by bank;
- performance by topic;
- overall and topic mastery estimates;
- mastery confidence and recent trend.

The Exam 1 dashboard uses the same source for Recent Activity and the Personal Mastery dashboard. Study Studio uses it for the detailed analytics section.

## Universal search

`question-search.js` is separate from the intelligence store. It builds a canonical question index only when Search is opened.

The index searches:

- stems;
- answer choices;
- explanations;
- topics;
- citations/source text.

Results route into the existing Study Studio question view rather than introducing another quiz runtime.

## Question issues

The existing Report Question workflow remains the user-facing reporting interface. Submitting a report also writes normalized issue metadata into study intelligence so issue counts/history can sync with the rest of the study data.

## Release requirements

CI must fail if:

- an answer runtime stops recording through study intelligence;
- the study-intelligence store falls out of the sync contract;
- Smart Review, Due Review, mastery, or Adaptive 2.0 wiring disappears;
- Universal Search is no longer globally available;
- semantic content auditing leaves the quality workflow;
- duplicate cloud auth listeners return.
