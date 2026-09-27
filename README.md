# SRNA Study Tool

## Release status

**Stable 1.x / Phase 2 improvement pass complete** — canonical quiz runtimes, balanced answer presentation, duplicate-aware Studio/Adaptive sessions, refined adaptive selection, cumulative Weak Areas, private in-app question reporting, responsive mobile layouts, local-first persistence, Supabase cross-device sync, diagnostics, accessibility guardrails, and automated release gates are in place.

SRNA Study Tool is a local-first study application for the nurse anesthesia equipment question banks.

## Current architecture

- Bank 1 defines the canonical quiz-session behavior.
- Bank 1, Bank 2, Bank 3, and Combined use one shared renderer and one shared quiz engine.
- Study Studio and Hazards use shared build-driven loaders.
- `study-intelligence.js` owns adaptive ranking, spaced review, recent activity, and analytics across every quiz runtime.
- `question-search.js` provides universal search across the canonical question repository and is loaded only when Search is opened.
- `equipment/build.json` is the release/cache source of truth.
- `equipment/assets/build-bootstrap.js` loads versioned shared assets.
- `equipment/assets/app-core.js` owns diagnostics, accessibility helpers, device identity, backup/import, and shared sync interfaces; `supabase-sync.js` provides authenticated cross-device cloud sync.
- CI validates architecture, structural and semantic content integrity, performance budgets, and browser regressions before a change is considered healthy.
- The checked-in Supabase migration directory mirrors the production migration history; applied migrations are not renamed or rewritten.

See [Phase 2](docs/PHASE2.md), [Architecture](docs/ARCHITECTURE.md), [Study intelligence](docs/STUDY_INTELLIGENCE.md), [Sync and backups](docs/SYNC.md), [Content quality audit](docs/CONTENT_AUDIT.md), [Phase 1 content-quality report](docs/CONTENT_QUALITY_PHASE1.md), [Question generation framework](docs/QUESTION_GENERATION.md), and [Contributing](CONTRIBUTING.md).
