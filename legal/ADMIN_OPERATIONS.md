# Operator Admin Operations

## Authorization model
The operator-admin role is stored in a private Supabase table and checked by server-side SECURITY DEFINER functions. It is not based on user-editable metadata.

## Permitted operator-admin functions
- View a high-level compliance/system summary, including account counts, approximate guest-session counts, CAT-user counts, and calibration totals.
- View limited account-management metadata (email, created/last sign-in, access status, current legal acceptance, CAT-used indicator).
- Suspend or re-grant cloud synchronization and Adaptive Mode access.
- Export legal-assent audit records.
- View privacy requests and update their workflow status.
- Run defined retention cleanup routines.
- Verify the current admin role.

## Intentionally excluded by default
The admin role does not create a general browser endpoint for:
- reading another user's synchronized study payload;
- reading raw first-attempt contribution rows;
- impersonating another account;
- changing another user's answers or CAT history;
- bypassing account authentication.

If future administration requires one of these powers, add a narrowly scoped server function and document the reason rather than granting broad table access.

## Privacy request handling
1. Verify the request is tied to the authenticated account when appropriate.
2. Move status to `in_review`.
3. Perform the requested action or document the reason for denial.
4. Set status to `completed` or `denied`.
5. Handle appeals separately to the extent reasonably practicable.

## Legal-assent exports
Exports are evidence records. Store them securely, do not publish them, and do not use them for unrelated analytics or profiling.

## Retention cleanup
Run the retention cleanup after major releases and periodically during active operation. Do not run cleanup against records subject to an active dispute, security investigation, or legal hold.
