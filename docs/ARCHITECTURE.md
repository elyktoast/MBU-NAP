# Architecture

## Source-of-truth rules

1. **Quiz behavior:** edit `equipment/assets/quiz-engine.js`. Do not copy behavior into individual bank pages.
2. **Canonical bank shell:** edit `equipment/assets/canonical-bank-page.js`.
3. **Bank metadata/data paths:** edit `equipment/exam-1/banks.json`.
4. **Study Studio runtime:** edit `equipment/assets/studio-page.js`.
5. **Hazards:** edit the shared standard/advanced engines and `hazards-page.js`.
6. **Build/cache behavior:** edit `build-bootstrap.js` or `auto-update.js`. Do not add manual `?v=` revisions.
7. **Cross-cutting app behavior:** diagnostics, accessibility helpers, backup/import, and sync interfaces belong in `app-core.js`.

## Runtime flow

Every application page loads the unversioned build bootstrap. The bootstrap fetches `equipment/build.json` with `no-store`, creates the build-scoped runtime, loads `app-core.js`, and then loads page-specific assets using the current build id.

Shared JSON is read through `MBUBuild.fetchJSON`, which deduplicates requests within a page and evicts failures so retry remains possible.

## Persistence

Quiz engines keep their existing localStorage formats. After a real write they call `MBUAppCore.touchStore(key)`, which maintains sync metadata separately. This avoids wrapping or changing stable save formats.

Cloud state also carries the last observed Supabase `server_revision`. Authenticated writes use an atomic PostgreSQL compare-and-write function so stale devices cannot blindly overwrite a newer cloud revision.

## Release gates

The ordered CI workflow runs:
1. repository architecture validation;
2. content-integrity validation;
3. performance/architecture budgets;
4. browser regression tests, including cloud-account, conflict, mobile, and accessibility coverage.

GitHub Pages deployment remains the deployment gate.
