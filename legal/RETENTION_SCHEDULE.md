# Data Retention Schedule

The default rule is to keep identifiable or account-linked information only as long as needed for the stated purpose, security, user-request handling, or defensible legal records.

| Data category | Default retention | Disposal / trigger |
| --- | --- | --- |
| Guest study progress | Browser-controlled | Until the user clears browser storage or replaces/imports local data |
| Guest session heartbeat | Approximately 24 hours | Automatic/server cleanup based on last-seen timestamp |
| Authentication account | While account is active | Removed through self-service account deletion |
| Current cloud study state | While account is active | Removed when the account is deleted |
| Cloud restore/version history | Up to 90 days | Eligible for periodic operator retention cleanup |
| Device sync records | While account/device is active | User can forget a device; remaining records are removed with account deletion |
| Raw first-attempt CAT contributions | While account is active | Removed with account deletion; aggregate item statistics are recalculated |
| Population CAT calibration | De-identified aggregate; ongoing while useful | Remove if no longer operationally useful or if de-identification can no longer be maintained |
| Privacy requests | While needed to process and document the request; target maximum 3 years after closure unless earlier deletion is appropriate | Periodic operator review/cleanup |
| Question reports | Target maximum 2 years after resolution unless still needed for an active quality/security issue | Periodic operator review/cleanup |
| Authenticated legal-assent evidence | Up to 5 years from server recording | Automated/admin cleanup after retention date; retained record is pseudonymous and excludes plaintext email |
| Legal document snapshots and manifests | Indefinite operational/legal archive | Do not alter; supersede with a new version instead |
| Security incident records | At least while needed for investigation, legal obligations, or defense | Review after closure with counsel if a serious incident occurred |

Any legal hold, active dispute, fraud/security investigation, or nonwaivable legal requirement may require suspending ordinary deletion for the affected records. Such exceptions should be documented and narrowly scoped.
