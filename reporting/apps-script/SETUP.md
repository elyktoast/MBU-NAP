# MBU-NAP Question Reporting Setup

The site now has a shared structured question-report modal. Reports are designed to go to a Google Apps Script web app that:

1. creates an `MBU-NAP Question Reports` Google Sheet automatically on the first report,
2. appends every report as a new row,
3. emails the Apps Script deploying account by default,
4. keeps the reporter's email/private account information out of the public website source.

## One-time deployment

1. Go to https://script.google.com and create a new standalone Apps Script project.
2. Replace `Code.gs` with the contents of `reporting/apps-script/Code.gs`.
3. In Project Settings, enable **Show "appsscript.json" manifest file in editor**, then replace the manifest with `reporting/apps-script/appsscript.json`.
4. Deploy > New deployment > **Web app**.
5. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Authorize the requested Google Sheets and Mail permissions.
7. Copy the deployed `/exec` URL.
8. Put that URL into `equipment/assets/studio-sync.js` as `REPORT_ENDPOINT` (or set `window.MBU_REPORT_ENDPOINT` before the asset loads).

Optional: in Apps Script Project Settings > Script Properties, add `REPORT_EMAIL` if reports should go to a different address than the deploying account.

After the endpoint is configured, classmates can report questions without a GitHub or Google login. Each report is emailed and recorded in the Sheet. The browser also keeps a local backup.
