# MBU-NAP 1.0

Release date: 2026-09-26

## Stable scope

MBU-NAP 1.0 includes:

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
2. canonical content-integrity validation across 1,950 questions;
3. performance/architecture budgets;
4. the full Playwright browser regression suite;
5. GitHub Pages build and deployment;
6. Supabase security/performance advisor review.

Cross-device synchronization had also previously been verified using separate desktop and iPhone browser devices before final hardening. The final release preserves that same local-first sync path while adding server-authoritative write protection.

## Known source-content debt

These are documented source limitations, not runtime defects:

- Bank 1's 500 legacy questions do not contain explicit topic metadata.
- Bank 1 contains 21 approved duplicate-stem occurrences.
- Workstation Hazards Set 2 contains 65 duplicate occurrences inherited from the original source implementation. They remain for compatibility until authoritative replacement source material is available.
- Automated integrity checks can verify structure, citations, answer indexing, and explanations, but cannot independently prove every anesthesia answer against lecture material that is not stored in the repository.

See `docs/CONTENT_AUDIT.md` for the detailed content audit.

## Accepted platform limitation

Supabase Free does not expose leaked-password protection. The project uses an 8-character minimum password and retains the Security Advisor warning as an accepted plan limitation. No Supabase secret/service-role credential is shipped to the browser.
