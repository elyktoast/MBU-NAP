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
