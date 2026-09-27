# Security Incident Response Plan

## Purpose
Use this process for suspected unauthorized access, credential exposure, data loss, unexpected disclosure, malicious changes, or material service-provider security events affecting SNAR Study Tool.

## 1. Contain
1. Disable or rotate exposed credentials immediately.
2. Disable affected functions or deployments when continued operation could increase harm.
3. Preserve relevant database, Git, deployment, and service-provider logs before making nonessential changes.
4. Do not delete evidence needed to understand scope.

## 2. Assess
Document:
- detection time and source;
- affected systems and providers;
- data categories potentially involved;
- approximate number of accounts or records involved;
- whether credentials, email addresses, study data, privacy requests, legal-assent records, or question-report data were involved;
- whether data was actually accessed or only potentially exposed;
- containment actions already taken.

## 3. Eradicate and recover
- Remove the root cause rather than adding a bypass.
- Rotate compromised keys or secrets.
- Restore from known-good code/data when necessary.
- Run repository quality gates and Supabase security advisors after remediation.
- Verify authentication, account deletion, privacy requests, sync, and Adaptive Mode before returning the affected feature to normal use.

## 4. Notification analysis
Promptly evaluate whether any contractual, state breach-notification, provider-notification, law-enforcement, insurer, or other legal obligation applies. Do not assume that every security event is a legally reportable breach, and do not assume that a small deployment is exempt.

If notification may be required, preserve the facts needed for counsel or the relevant regulator to evaluate timing, content, recipients, and method.

## 5. Post-incident review
Record:
- root cause;
- affected data and users;
- timeline;
- corrective actions;
- whether the Privacy Notice, Terms, retention schedule, or data inventory must change;
- new CI/security controls needed to prevent recurrence.

## Provider contacts
Use the provider administration consoles and published security/support channels for Supabase, GitHub, and Google Apps Script/Google Workspace as applicable. Do not place private credentials in this repository.
