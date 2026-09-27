# Contributing to SRNA Study Tool

## Do not patch around a broken source

Changes should replace or correct the owning implementation. Do not add duplicate handlers, page-specific fallbacks, copied quiz engines, or manual cache-version workarounds.

## Where changes belong

- Quiz behavior: `equipment/assets/quiz-engine.js`
- Shared bank shell: `equipment/assets/canonical-bank-page.js`
- Bank configuration: `equipment/exam-1/banks.json`
- Studio: `equipment/assets/studio-page.js`
- Hazards: shared Hazards engines/loaders
- Navigation: `equipment/assets/site-nav.js`
- Cross-cutting app behavior: `equipment/assets/app-core.js`
- Build/update logic: `build-bootstrap.js` and `auto-update.js`
- Question content: canonical JSON files under `equipment/exam-1/data/`
- Cloud adapter/auth: `equipment/assets/supabase-sync.js`
- Cloud schema/conflict logic: committed migrations under `supabase/migrations/`

## Before merging

Run:

```bash
npm run quality
npm run test:e2e
```

`npm run quality` includes architecture validation, content integrity, and performance budgets. Known content debt belongs in the explicit content baseline and `docs/CONTENT_AUDIT.md`; do not silence new integrity failures with broad exceptions.

When shared runtime assets change, update `equipment/build.json`. Never add a manual `?v=` query parameter.
