# Architecture

## Source-of-truth rules

1. **Quiz behavior:** edit `equipment/assets/quiz-engine.js`. Do not copy behavior into individual bank pages.
2. **Canonical bank shell:** edit `equipment/assets/canonical-bank-page.js`.
3. **Bank metadata/data paths:** edit `equipment/exam-1/banks.json`.
4. **Study Studio runtime:** edit `equipment/assets/studio-page.js`.
5. **Hazards:** edit the shared standard/advanced engines and `hazards-page.js`.
6. **Build/cache behavior:** edit `build-bootstrap.js` or `auto-update.js`. Do not add manual `?v=` revisions.
7. **Cross-cutting app behavior:** diagnostics, accessibility helpers, backup/import, and sync interfaces belong in `app-core.js`.
8. **Question-generation framework:** provider registration, draft validation, approval, and Generated Bank storage belong in `question-generator.js`. Do not hardcode a provider until the feature is intentionally enabled.
9. **Study intelligence:** answer history, spaced-review scheduling, adaptive ranking, recent activity, and shared issue metadata belong in `study-intelligence.js`.
10. **Universal search:** canonical question indexing and search UI belong in `question-search.js`; keep it lazy-loaded at first use.

## Runtime flow

Every application page loads the unversioned build bootstrap. The bootstrap fetches `equipment/build.json` with `no-store`, creates the build-scoped runtime, loads `app-core.js`, and then loads page-specific assets using the current build id.

Shared JSON is read through `MBUBuild.fetchJSON`, which deduplicates requests within a page and evicts failures so retry remains possible.

Study Studio also loads a dormant provider-neutral question-generation framework. The manifest keeps it disabled by default. If enabled later, only reviewed and approved generated questions are bridged into Studio as a separate Generated Bank.

## Persistence

Quiz engines keep their existing localStorage formats. After a real write they call `MBUAppCore.touchStore(key)`, which maintains sync metadata separately. This avoids wrapping or changing stable save formats.

Cloud state also carries the last observed Supabase `server_revision`. Authenticated writes use an atomic PostgreSQL compare-and-write function so stale devices cannot blindly overwrite a newer cloud revision. The account panel can list synced devices and the existing version trail, and restores are performed as new server-authoritative writes rather than mutating history.

## Release gates

The ordered CI workflow runs:
1. repository architecture validation;
2. content-integrity validation;
3. deterministic semantic-content audit;
4. performance/architecture budgets;
5. browser regression tests, including cloud-account, conflict, mobile, and accessibility coverage.

GitHub Pages deployment remains the deployment gate.


## Stable architecture baseline

As of the study-intelligence release, the core application architecture is considered stable.

Future feature work should extend the existing shared modules rather than introduce new per-bank runtimes:

- Banks 1–3 and Combined remain on the canonical quiz engine.
- Hazards remains on the two shared Hazards runtimes selected by the manifest.
- Cross-bank learning history, spaced review, activity, reports, and analytics remain in `study-intelligence.js`.
- Universal search remains in `question-search.js`.
- Backup, diagnostics, accessibility, shared navigation utilities, and sync interfaces remain in `app-core.js`.
- Cloud transport/auth/conflict/history/device behavior remains in `supabase-sync.js`.
- Generated-question provider logic remains behind the disabled provider-neutral framework until deliberately enabled.

Repository validation and browser regression tests are the enforcement mechanism for this baseline. A future architectural change should deliberately update those contracts rather than bypassing them.

## Foundation freeze

The post-Phase-3 technical foundation is frozen at build `2026-09-28-foundation-freeze-v252`. See `docs/FOUNDATION_FREEZE.md` for the final audit findings, accepted non-blocking external items, and rules for future changes.

## Phase 4 learning extensions

The frozen foundation is extended, not replaced, by the first Phase 4 learning features:

- personal mastery remains derived inside `study-intelligence.js` from the existing synchronized learning history;
- the Exam dashboard renders that shared mastery model without creating a second learner-state store;
- Adaptive 2.1 remains isolated in `adaptive-quiz.js` and consumes the same shared learning priority used by Smart Review;
- personal weakness changes selection priority, not item difficulty;
- population difficulty remains gated by the existing calibration cohort thresholds;
- the learner-facing mastery estimate is explicitly a study estimate, not an exam-pass prediction.

## Precalibration CAT hardening

Adaptive 2.1 extends the frozen learning architecture without introducing a second learner model or item bank. The production selector now owns diagnostic opening behavior, pool-derived blueprint constraints, concept cooldown, provisional-difficulty uncertainty, and randomesque top-candidate selection. The session seed and all new selection state are persisted through the existing Studio sync sanitizer so reload and cloud sync preserve the same adaptive path.

`scripts/cat-simulator.mjs` executes the production `adaptive-quiz.js` runtime inside a sandbox with synthetic response patterns. It is a behavioral/stability check only; it does not create empirical item calibration or establish certification-exam validity. CI runs the simulator before browser regression.


## Multi-course foundation

Basic Principles is the only currently published course. Equipment Exam 1 remains an internal reference/regression implementation, but it must not appear in public course navigation. Shared behavior is course-agnostic. New course pages set `window.MBU_CONTEXT` before the shared bootstrap loads. The context supplies a course ID, course label, course URL, and exam URL.

Course/exam learner state is isolated:

- Equipment Exam 1 preserves the original `mbu_exam1_studio_v1` and `mbu_study_intelligence_v1` stores for backward compatibility.
- New exams use namespaced `mbu_studio_<course>_<exam>_v1` and `mbu_study_intelligence_<course>_<exam>_v1` stores.
- New bank storage keys should use the `mbu_course_` prefix so backup and cloud sync can preserve them across course switches.
- Cloud snapshot import/export accepts and retains recognized multi-course store prefixes, so syncing one course does not discard another course's state.

Basic Principles Exam 1 is the active published course and intentionally uses an empty standalone-bank manifest because its Study Studio exposes one lecture-organized unified pool. Shared quiz, Studio, CAT, search, sync, analytics, and study-intelligence code must not be copied into the Basic Principles folder.

## Canonical Session v1

Equipment Quiz Bank 1 Practice Set 1 defines the standard learner-facing quiz environment. Its stable identifier is `equipment-bank1-practice-set1-v1`.

Future standard banks are content/configuration only: canonical JSON, optional images, and a manifest entry using `engine: "canonical"`. The shared `canonical-bank-page.js`, `quiz-engine.js`, and `bank1-quiz-ui.css` own the page shell and session behavior. New courses must not fork those modules.

The canonical bank renderer is course-aware through `MBU_CONTEXT.examUrl` and can resolve a bank from `?bank=<id>`, allowing a course to use a single generic bank page.

## Global CAT evidence

First-attempt evidence is collected into one platform-wide Supabase contribution table for all courses. Each contribution carries a globally unique question ID plus `course_id`, `exam_id`, `bank_id`, `topic`, response correctness, optional response time, and session mode. This shared evidence pool supports platform-level item analysis while preserving course/exam scopes for CAT ability, blueprint, and future stopping-rule calibration. Learner-facing mastery and theta remain scoped rather than being collapsed into one cross-course score.
