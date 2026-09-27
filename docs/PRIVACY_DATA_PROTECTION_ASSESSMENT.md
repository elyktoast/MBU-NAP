# SNAR Study Tool Privacy and Data Protection Assessment

Effective assessment date: September 27, 2026

## Purpose

This document records the current data flows, purposes, foreseeable privacy risks, and safeguards for SNAR Study Tool. It is an internal engineering/compliance record and does not replace the public Privacy Notice or legal advice.

## Product scope

SNAR Study Tool is an independent educational study application. Normal study functions are available without an account. An account is required for Adaptive Mode and optional cloud synchronization.

## Data map

### Guest/local data
Stored in browser local storage:
- quiz progress and answers;
- flags and crossed-out choices;
- study history and review schedules;
- local app/settings state;
- local Terms/Privacy acceptance version and timestamp.

Purpose: provide study functionality and preserve local progress.

### Account/authentication data
Processed through Supabase Auth:
- email address;
- authentication/session information;
- internal account ID;
- Terms version, Privacy version, adult acknowledgement, and acceptance timestamp supplied at signup.

Purpose: authentication, account security, account recovery, Adaptive Mode access, and cloud sync.

### Immutable legal acceptance record
Stored in a restricted private database table:
- account ID;
- Terms version;
- Privacy version;
- adult acknowledgement;
- acceptance timestamp;
- server recording timestamp.

Purpose: preserve an immutable record of account assent. Browser roles have no direct access to this table.

### Cloud study progress
Stored in authenticated Supabase tables:
- study progress and session state;
- study history/review schedules;
- flags and related study settings;
- device synchronization metadata;
- version-history records.

Purpose: cross-device synchronization, backup, conflict resolution, and restore.

### Item-calibration contribution
Restricted private table:
- account ID;
- question ID;
- first-attempt correct/incorrect;
- optional response time;
- session mode;
- timestamp.

Purpose: deduplicate statistical contributions and improve item calibration.

Control: primary key prevents more than one account contribution per question.

### De-identified aggregate calibration
Authenticated-readable aggregate table:
- question ID;
- unique learner count;
- first-attempt correct/incorrect counts;
- response-time summary;
- estimated difficulty and uncertainty;
- calibration confidence;
- last update.

Purpose: question testing/validation and Adaptive Mode calibration.

The aggregate does not contain name, email, password, device identity, or account ID. SNAR Study Tool publicly commits not to re-identify this data.

### Question reports
Delivered through Google Apps Script:
- question identifier/context;
- issue category;
- free-text comment;
- technical request information processed by the delivery provider.

The app does not request a reporter name. Users are warned not to enter sensitive or patient information.

### Privacy requests
Stored with authentication:
- account ID;
- request type;
- optional details;
- status;
- timestamps.

Purpose: handle access, correction, deletion, appeal, and other privacy requests.

## Data minimization

The application does not intentionally collect demographic, health, financial, precise-location, government-identification, or other sensitive attributes for Adaptive Mode. It does not sell personal data or use it for targeted advertising.

## Key risks and safeguards

1. **Unauthorized cloud access**
   - Supabase authentication and Row Level Security protect account-scoped data.
   - Browser code contains only the public/publishable Supabase key.

2. **Duplicate or manipulated calibration**
   - One contribution per account/question is enforced at the database level.
   - Private contribution records are not readable by normal browser roles.

3. **Re-identification**
   - Aggregate calibration is stored separately from account identifiers.
   - Public Privacy Notice contains a non-reidentification commitment.
   - Any future recipient of de-identified data must be required to maintain de-identification when applicable law requires it.

4. **Overcollection**
   - Guest study data remains local.
   - CAT/account collection is limited to operational and calibration fields.
   - No advertising profile is created.

5. **Consent/enforceability**
   - Guest use requires a one-time click-through to the Terms and Privacy Notice stored locally by version.
   - Account creation requires a separate 18+ and Terms/Privacy acknowledgement.
   - Account acceptance is copied at signup into an immutable private server-side ledger.

6. **Deletion**
   - Self-service account deletion uses an authenticated server-side Edge Function.
   - Foreign-key cascades remove account-linked sync data, private calibration contributions, privacy requests, and legal-acceptance records as designed.
   - Aggregate calibration is recalculated from remaining contributions.
   - Local browser data is controlled separately by the user/browser.

7. **Misleading affiliation**
   - Product branding is SNAR Study Tool.
   - Public terms and privacy materials expressly state that the tool is independent and not affiliated with a university, school, certifying body, licensing board, or examination provider.
   - Faculty/university attribution was removed from canonical question data.

## High-risk processing assessment

Current Adaptive Mode changes which study question a user receives. It is not used to determine enrollment, employment, certification, licensing, insurance, health-care eligibility, credit, or another legally significant outcome. The project does not sell personal data, conduct targeted advertising, or intentionally process sensitive personal data for calibration.

If any of those facts change, this assessment must be revisited before the new processing begins.

## Review triggers

Re-review this assessment before:
- formal university/institutional adoption;
- human-subject research or publication using identifiable/pseudonymous learner data;
- collection of demographic or sensitive attributes;
- advertising or sale/sharing of personal data;
- disclosure of calibration data to an external recipient;
- material changes to Adaptive Mode purposes;
- expansion into jurisdictions with additional privacy requirements;
- a material security incident;
- material changes to the Privacy Notice or Terms.

## Current known operational follow-up

Enable Supabase leaked-password protection when available in the Auth dashboard.
