# MBU-NAP

## Release status

**Stable 1.0** — the canonical quiz runtimes, Study Studio, Hazards, local-first persistence, Supabase cross-device sync, recovery tools, diagnostics, accessibility guardrails, and automated release gates are in place.

MBU-NAP is a local-first study application for the MBU nurse anesthesia equipment question banks.

## Current architecture

- Bank 1 defines the canonical quiz-session behavior.
- Bank 1, Bank 2, Bank 3, and Combined use one shared renderer and one shared quiz engine.
- Study Studio and Hazards use shared build-driven loaders.
- `equipment/build.json` is the release/cache source of truth.
- `equipment/assets/build-bootstrap.js` loads versioned shared assets.
- `equipment/assets/app-core.js` owns diagnostics, accessibility helpers, device identity, backup/import, and shared sync interfaces; `supabase-sync.js` provides authenticated cross-device cloud sync.
- CI validates architecture, content integrity, performance budgets, and browser regressions before a change is considered healthy.

See [Architecture](docs/ARCHITECTURE.md), [Sync and backups](docs/SYNC.md), [Content quality audit](docs/CONTENT_AUDIT.md), [Question generation framework](docs/QUESTION_GENERATION.md), and [Contributing](CONTRIBUTING.md).
