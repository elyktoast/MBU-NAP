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
- synchronized question-issue metadata.

It does **not** replace each quiz runtime's native progress state. Native save formats remain authoritative for resuming an individual quiz. Study intelligence adds a normalized learning layer across those formats.

## Storage

Local/cloud store:

`mbu_study_intelligence_v1`

The store participates in the normal MBU-NAP local-first backup and Supabase sync envelope.

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

## Smart Review

Smart Review ranks questions using the normalized learning history. Priority increases for:

- currently due questions;
- the most overdue questions;
- the last answer being incorrect;
- low cumulative accuracy;
- repeated misses;
- questions not seen recently.

Questions with no learning history remain eligible. Equal-priority questions use a deterministic UID hash as a tie-breaker so a cold-start review is distributed across the loaded repository instead of defaulting to the first bank.

Smart Review currently selects up to 50 questions.

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
- performance by topic.

The Exam 1 dashboard uses the same source for Recent Activity. Study Studio uses it for the detailed analytics section.

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
- Smart Review or Due Review wiring disappears;
- Universal Search is no longer globally available;
- semantic content auditing leaves the quality workflow;
- duplicate cloud auth listeners return.
