# Operational Provider Register

## Supabase
**Purpose:** authentication, database storage, cross-device synchronization, account management, privacy requests, legal-assent records, and CAT calibration infrastructure.

**Data potentially processed:** account email/authentication data, account identifiers, synchronized study data, device metadata, privacy requests, first-attempt contribution records, legal-assent records, de-identified/aggregate calibration data, and short-lived random guest-session identifiers/timestamps used for approximate guest-session counts.

**Control:** browser receives only the public/publishable key. Secret/service-role credentials must never be committed to browser code. RLS and restricted RPCs enforce account/admin boundaries.

## GitHub Pages / GitHub
**Purpose:** static website hosting, source control, deployment, and CI.

**Data potentially processed:** ordinary web-request/hosting metadata and repository/deployment metadata. Account study data is not intentionally written to GitHub Pages.

## Google Apps Script / Google
**Purpose:** question-report delivery to the operator.

**Data intentionally sent by the application:** question/report context, free-text report comment, app build, and sanitized page path. The application report payload is designed not to include account email, account ID, browser user-agent string, URL query parameters, or URL fragments.

## Review rule
Before adding or replacing a provider, document its purpose, data categories, access, retention implications, and whether the public Privacy Notice requires an update.
