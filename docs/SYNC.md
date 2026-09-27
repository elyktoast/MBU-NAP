# Saving, backups, and cross-device sync

## Current model

MBU-NAP is local-first. Progress is written to browser localStorage immediately, so quiz interactions do not wait on the network.

When a user signs in from the persistent **Cloud** control in the site header, the same save stores are synchronized to Supabase. The browser uses only the project's public publishable key. Supabase Auth provides the user JWT, and Row Level Security limits every cloud row to that authenticated user.

## Supabase backend

Production schema:

- `public.mbu_sync_state`: current copy of each save store;
- `public.mbu_sync_versions`: automatic version history, capped at 100 versions per user/store;
- `public.mbu_sync_devices`: devices that have synced the account.

Committed database migrations:

- `supabase/migrations/20260927000217_create_mbu_sync_schema.sql`
- `supabase/migrations/20260927010714_add_server_authoritative_sync_write.sql`
- `supabase/migrations/20260927011217_remove_unused_sync_device_index.sql`

## Authentication

The browser supports:

- email/password account creation;
- email confirmation and confirmation resend;
- sign-in and sign-out;
- password-reset email requests;
- recovery-link handling and password update.

Session tokens are stored locally in the browser. The Supabase secret/service-role key is never used by the application.

## Sync behavior

- Opening the app while signed in performs a full pull/merge/push.
- Local save changes remain immediate and schedule a debounced cloud push.
- Returning to the app after two minutes or reconnecting to the network performs another full sync.
- While signed in, MBU-NAP performs a full automatic sync every five minutes as a cross-device safety net.
- The site header always shows cloud state (**Signed out**, **Syncing**, **Synced**, or **Error**) and opens the dedicated account panel.
- A manual **Sync now** control remains available from the account panel and Tools.
- **Devices** lists browsers/devices that have synced the account. Forget removes a stale device entry from that list; it does not remotely revoke that device's existing authentication session, so an active signed-in device can appear again when it next syncs.
- **Restore Progress** exposes recent `mbu_sync_versions` entries. Restoring writes the selected historical payload back through the same server-revision conflict guard, preserving the pre-restore current state in history.
- Tools focuses on practical study/sync status, while manual backup/import and diagnostics live in secondary expandable sections.
- If a full sync downloads newer progress, the page reloads once so the active quiz runtime uses the imported state.

The existing `MBUSync` schema-1 envelope remains the compatibility layer between local saves and the Supabase adapter.

## Conflict model

Every cloud row has a monotonically increasing `server_revision`.

The browser keeps the last server revision alongside local metadata. A write is sent through `mbu_sync_write_state` with the server revision the device last observed. PostgreSQL locks the row and applies the write only when that expected revision still matches.

If another device changed the row first, the stale write is rejected. The browser imports the newer server row instead of blindly overwriting it. Client timestamps and client revisions remain useful as local/import tie-breakers, but server revision is the first comparison for cloud-derived state.

This prevents a device with a skewed clock or stale tab from silently overwriting newer cross-device progress.

## Security

All three sync tables have Row Level Security enabled. Policies are restricted to the `authenticated` role and require `auth.uid() = user_id`.

The conflict-write function is `SECURITY INVOKER`, so it remains subject to the caller's RLS permissions. The application cannot read or write another user's save rows through the public API.

Supabase Free does not provide leaked-password protection. The project therefore uses the strongest password controls available on the current plan, including an 8-character minimum, while the advisor warning remains an accepted Free-plan limitation.
