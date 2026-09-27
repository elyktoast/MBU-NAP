# Data Inventory and Flow Register

| Data | Source | Purpose | Storage / processor | Access | Deletion |
| --- | --- | --- | --- | --- | --- |
| Email and authentication credentials | Account user | Sign-in, recovery, account security | Supabase Auth | User; Supabase; operator only through provider administration when necessary | Account deletion |
| Local study progress | Browser | Resume study, analytics, Smart/Due Review | Browser localStorage | User's browser | User clears/replaces local data |
| Cloud study state and versions | Signed-in browser | Cross-device sync and restore | Supabase | Owning authenticated user through RLS | Account deletion; old versions subject to retention schedule |
| Device sync metadata | Signed-in browser | Device management and sync reliability | Supabase | Owning authenticated user | Forget-device control or account deletion |
| First-attempt question contribution | Signed-in browser | Question-quality testing and Adaptive Mode calibration | Private Supabase table | Server functions only; operator gets counts, not routine raw-row access | Account deletion |
| Population item calibration | Server aggregation | Improve item difficulty estimates | Supabase aggregate table | Signed-in clients only at 25+ unique contributors; operator | Aggregate retention policy |
| Legal assent | Authenticated account | Evidence of Terms/Privacy assent | Private Supabase ledger | Operator admin through restricted RPC; not normal users | Pseudonymous record retained to defined legal-record date |
| Privacy request | Signed-in user | Access/correction/deletion/appeal handling | Supabase | Requesting user under RLS; operator admin through restricted RPC | Retention schedule |
| Question report | User report form | Investigate question/content issues | Google Apps Script / operator report sheet/email | Operator | Retention schedule |
| Static site request metadata | Browser/network | Website delivery/security | GitHub Pages and network providers | Provider according to its systems | Provider-controlled |
| Security/diagnostic information | Browser/operator/provider | Troubleshooting and security | Local diagnostics and provider logs | User/operator/provider as applicable | Purpose/provider retention |

## Prohibited/intentionally excluded data
SNAR Study Tool is not designed to collect patient-identifiable information, protected health information, school education records, grades, government identifiers, precise geolocation, payment-card data, or sensitive demographic profiles.

## Change-control rule
A feature that adds a new data category, external recipient, tracking technology, advertising use, school/clinical relationship, or materially different purpose requires updating this inventory and reviewing the Privacy Notice before deployment.
