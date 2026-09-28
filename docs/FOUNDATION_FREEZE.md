# Foundation Freeze

Frozen baseline date: 2026-09-28  
Runtime build: `2026-09-28-foundation-freeze-v252`

## Purpose

This checkpoint freezes the shared application foundation after the final deep technical audit. New product work should build on the existing architecture rather than reopen stable infrastructure without evidence of a defect or a deliberate architecture change.

## Audit coverage

The freeze audit reviewed:

- shared bootstrap and build-version loading;
- automatic update behavior;
- quiz, Studio, Hazards, and shared runtime boundaries;
- browser storage and cloud-sync lifecycle;
- Supabase authentication, Row Level Security, RPC, migration, and Edge Function state;
- admin/report workflows;
- repository size and performance budgets;
- CI structure and browser regression coverage;
- production database security/performance advisors;
- recent production error logs;
- dead/retired production surfaces.

## Fixes made during the freeze audit

1. **Bounded startup and asset requests**
   - The build-manifest request now has a hard timeout.
   - Shared script and stylesheet loads now time out and remove the pending asset instead of leaving startup hanging indefinitely.
   - Shared JSON requests continue to use the central request cache and now share the bounded fetch path.

2. **Bounded update checks**
   - The automatic build checker now aborts stalled requests and always releases its in-flight state.

3. **Transient authentication recovery**
   - A temporary refresh-token network failure no longer deletes the saved session.
   - Only definitive authentication rejection (HTTP 400/401/403) clears the saved session.
   - Startup no longer reports a retained session as signed out or starts guest tracking after a transient refresh failure.
   - Browser regression coverage verifies that the retained session can be refreshed successfully on the next attempt.

4. **CI runtime maintenance**
   - GitHub Actions checkout/setup runtimes were refreshed to the current Node 24-based action generation.
   - Existing architecture/content/performance/browser gates remain unchanged.

5. **Budget discipline**
   - The Supabase browser runtime remained under its existing 25 KB performance budget. The budget was not loosened to accommodate the fixes.

## Production review

At this checkpoint:

- repository and production Supabase migration histories are aligned;
- the private question-report table has Row Level Security enabled;
- the private RPC-only tables intentionally have no direct RLS policies;
- application-facing SECURITY DEFINER RPCs retain their explicit authorization checks;
- recent production logs showed no recurring application error pattern;
- the two currently reported unused indexes are retained because they back legitimate privacy/question-report lookup paths and have not had enough real traffic to justify removal.

## Known non-blocking external items

- **Leaked-password protection** remains disabled in Supabase Auth. This is a project Auth setting, not a repository code defect.
- The retired production Edge Function `snar-delete-account` still exists because the connected Supabase tooling does not expose Edge Function deletion. It returns HTTP 410 and the repository explicitly forbids frontend references to it. The active account-deletion path is `delete-account`.

Neither item changes the frozen browser/runtime architecture.

## Freeze rules

After this checkpoint:

1. Do not add per-bank copies of shared quiz behavior.
2. Do not bypass `MBUBuild.fetchJSON` for shared application JSON.
3. Do not loosen size/performance budgets simply to make a change pass.
4. Any runtime asset change must publish a new `equipment/build.json` build id.
5. Supabase DDL changes must be applied as migrations and mirrored one-to-one in the repository.
6. Cloud sync must remain local-first and must preserve local progress on network failure.
7. Authentication/network failures must remain retryable unless the server definitively rejects the credential.
8. New features should extend the documented shared modules rather than add fallback layers or duplicate handlers.
9. Quality gates and browser regression must be green before a new frozen baseline is accepted.

## Frozen architecture

The architecture documented in `docs/ARCHITECTURE.md` is the foundation for the next product phase. Future changes should be feature work, measured optimization, or evidence-driven bug fixes rather than speculative rewrites.
