# SRNA Study Tool 1.0

Release date: 2026-09-27

## Stable scope

SRNA Study Tool 1.0 includes:

- one canonical Bank 1-style quiz runtime for Banks 1–3 and Combined;
- Study Studio on the shared build-driven runtime;
- shared Workstation Hazards runtimes and indexed image assets;
- local-first progress persistence with portable backup/import;
- authenticated Supabase cross-device synchronization;
- five-minute automatic cloud sync plus save-triggered, focus, reconnect, and manual sync;
- server-revision conflict protection so stale devices cannot blindly overwrite newer cloud state;
- email confirmation, confirmation resend, password-reset, and recovery-link handling;
- persistent cloud/account status and the practical Tools dashboard;
- mobile/keyboard accessibility guardrails, focus trapping, live regions, image alternatives, and reduced-motion support;
- centralized build/cache handling and request deduplication;
- repository architecture, content-integrity, performance, and Playwright browser release gates.

## Release verification

The release-candidate build passed:

1. repository architecture validation;
2. canonical content-integrity validation across 2,000 questions;
3. performance/architecture budgets;
4. the full Playwright browser regression suite;
5. GitHub Pages build and deployment;
6. Supabase security/performance advisor review.

Cross-device synchronization had also previously been verified using separate desktop and iPhone browser devices before final hardening. The final release preserves that same local-first sync path while adding server-authoritative write protection.

## Content-audit status

The source-grounded content rebuild completed on 2026-09-27:

- all 2,000 canonical questions pass structural/content-integrity gates;
- all 21 former Bank 1 same-set duplicate occurrences were replaced;
- all 65 former repetitive Workstation Hazards Set 2 slots were rebuilt;
- Hazards Set 2 now contains 100/100 unique normalized stems;
- no same-set exact duplicate groups remain;
- no same-stem + same-option-pool conflicting answer keys remain;
- topic and canonical source metadata are complete.

Heuristic review queues remain for future refinement (94 short-explanation flags and 34 long-keyed-answer flags). These are review prompts, not proven defects or release blockers.

See `docs/CONTENT_AUDIT.md` for the detailed content audit.

## Phase 1 release hardening

The 2026-09-27 hardening pass added and verified:

- responsive phone navigation and compact mobile landing layouts;
- a regression guard preventing primary mobile navigation from wrapping incorrectly;
- production self-service account deletion through the authenticated `delete-account` Edge Function;
- removal of frontend use of the retired `snar-delete-account` endpoint;
- reconciliation of the checked-in Supabase migration history with all 31 migrations applied in production;
- database invariant checks for orphaned records, restore-history limits, guest-session retention, legal-acceptance retention, and current legal acceptance;
- Adaptive cross-outs scoped to the active Adaptive session, preventing old Studio cross-outs from appearing in a new Adaptive quiz while preserving them when that same Adaptive session is revisited;
- a clean repository branch state with only `main` remaining.

At the Phase 1 baseline, GitHub Pages deployment, repository validation, content integrity, semantic audit, performance budgets, and the full Playwright browser regression suite were green.

## Remaining project-level security setting

Supabase Security Advisor reports leaked-password protection as disabled. This is an Auth project setting rather than an application-code defect. It should be enabled in Supabase Auth settings when available for this project. No Supabase secret/service-role credential is shipped to the browser.
