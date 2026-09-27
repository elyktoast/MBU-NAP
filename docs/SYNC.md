# Saving, backups, and cross-device sync

## Current model

MBU-NAP is local-first. Progress is written to browser localStorage immediately, so quiz interactions do not wait on the network.

When a user signs in through **Tools → Cloud Sync**, the same save stores are synchronized to Supabase. The browser uses only the project's public publishable key. Supabase Auth provides the user JWT, and Row Level Security limits every cloud row to that authenticated user.

## Supabase backend

Production schema:

- `public.mbu_sync_state`: current copy of each save store;
- `public.mbu_sync_versions`: automatic version history, capped at 100 versions per user/store;
- `public.mbu_sync_devices`: devices that have synced the account.

The database migration is committed at `supabase/migrations/20260927000217_create_mbu_sync_schema.sql`.

## Authentication

The browser supports email/password account creation and sign-in through Supabase Auth. Session tokens are stored locally in the browser. The Supabase secret/service-role key is never used by the application.

## Sync behavior

- Opening the app while signed in performs a full pull/merge/push.
- Local save changes remain immediate and schedule a debounced cloud push.
- Returning to the app after two minutes or reconnecting to the network performs another full sync.
- While signed in, MBU-NAP also performs a full automatic sync every five minutes as a cross-device safety net.
- The site header always shows cloud state (**Signed out**, **Syncing**, **Synced**, or **Error**) and opens the dedicated account panel.
- A manual **Sync now** control remains available from the account panel and Tools. Tools focuses on practical study/sync status, while manual backup/import and diagnostics live in secondary expandable sections.
- If a full sync downloads newer progress, the page reloads once so the active quiz runtime uses the imported state.

The existing `MBUSync` schema-1 envelope remains the compatibility layer between local saves and the Supabase adapter.

## Merge model

Local/import comparison currently orders each store by:

1. client `updatedAt`;
2. client revision number;
3. device id as a deterministic tie-breaker.

Supabase additionally assigns a monotonically increasing `server_revision` to every cloud write and records each write in version history. This gives us a server-authoritative recovery trail even though the current live merge remains client-metadata based.

## Security

All three sync tables have Row Level Security enabled. Policies are restricted to the `authenticated` role and require `auth.uid() = user_id`. The app can never read or write another user's save rows through the public API.
