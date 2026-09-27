# Data Inventory and Flow Register

| Data | Source | Purpose | Storage / processor | Access | Deletion |
| --- | --- | --- | --- | --- | --- |
| Email and authentication credentials | Account user | Sign-in, recovery, account security and account administration | Supabase Auth | User; Supabase; restricted operator-admin account for account management | Account deletion |
| Local study progress | Browser | Resume study, analytics, Smart/Due Review | Browser localStorage | User's browser | User clears/replaces local data |
| Ephemeral guest session heartbeat | Unauthenticated browser | Approximate active guest-session counts | Private Supabase table | Server functions; operator sees aggregate counts only | Approximately 24 hours |
| Ephemeral guest session | Guest browser tab | Approximate active guest count | Private Supabase table | Aggregate counts to operator admin only | Approximately 24 hours |
| Account administration metadata | Supabase Auth/account tables | Account support, access control, compliance | Supabase | Operator admin only through restricted RPC | Account lifetime; legal evidence follows separate retention |
| Cloud study state and versions | Signed-in browser | Cross-device sync and restore | Supabase | Owning authenticated user through RLS | Account deletion; old versions subject to retention schedule |
| Device sync metadata | Signed-in browser | Device management and sync reliability | Supabase | Owning authenticated user | Forget-device control or account deletion |
| First-attempt question contribution | Signed-in browser | Question-quality testing and Adaptive Mode calibration | Private Supabase table | Server functions only; operator gets counts, not routine raw-row access | Account deletion |
| Population item calibration | Server aggregation | Improve item difficulty estimates | Supabase aggregate table | Signed-in clients only at 25+ unique contributors; operator | Aggregate retention policy |
| Legal assent | Authenticated account | Evidence of Terms/Privacy assent | Private Supabase ledger | Operator admin through restricted RPC; not normal users | Pseudonymous record retained to defined legal-record date |
| Privacy request | Signed-in user | Access/correction/deletion/appeal handling | Supabase | Requesting user under RLS; operator admin through restricted RPC | Retention schedule |
| Question report | Authenticated active-account report form | Investigate question/content issues | Private Supabase table | Operator admin sees report content/status; submitter identity is not stored in the report row | Resolved reports target max 2 years unless still needed for an active quality/security/dispute/legal matter |
| Static site request metadata | Browser/network | Website delivery/security | GitHub Pages and network providers | Provider according to its systems | Provider-controlled |
| Security/diagnostic information | Browser/operator/provider | Troubleshooting and security | Local diagnostics and provider logs | User/operator/provider as applicable | Purpose/provider retention |

## Prohibited/intentionally excluded data
SRNA Study Tool is not designed to collect patient-identifiable information, protected health information, school education records, grades, government identifiers, precise geolocation, payment-card data, or sensitive demographic profiles.

## Change-control rule
A feature that adds a new data category, external recipient, tracking technology, advertising use, school/clinical relationship, or materially different purpose requires updating this inventory and reviewing the Privacy Notice before deployment.
