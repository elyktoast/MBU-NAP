const SHEET_NAME = 'Question Reports';
const HEADERS = [
  'Received','Status','Reason','Reporter','Bank','Set','Question','UID','Topic',
  'Question Stem','Options','Keyed Answer','Selected Answer','Explanation','Source','Page',
  'Reporter Comment','Page URL','Build','User Agent'
];

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, max) {
  let text = Array.isArray(value) ? value.join('\n') : String(value == null ? '' : value);
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text.slice(0, max || 5000);
}

function getReportSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('REPORT_SHEET_ID');
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('MBU-NAP Question Reports');
    props.setProperty('REPORT_SHEET_ID', ss.getId());
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return { ss, sheet };
}

function doGet() {
  const props = PropertiesService.getScriptProperties();
  return json_({
    ok: true,
    service: 'MBU-NAP question reports',
    configured: !!(props.getProperty('REPORT_EMAIL') || Session.getEffectiveUser().getEmail())
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const p = JSON.parse(raw);
    const reason = clean_(p.reason, 120);
    const comment = clean_(p.comment, 2000);
    const uid = clean_(p.uid, 160);
    const stem = clean_(p.stem, 5000);

    if (!reason || !comment || !uid || !stem) {
      return json_({ ok: false, error: 'Missing required report fields.' });
    }

    const { ss, sheet } = getReportSheet_();
    const received = new Date();
    const row = [
      received,
      'Open',
      reason,
      clean_(p.reporter, 80),
      clean_(p.bankLabel || p.bank, 120),
      clean_(p.set, 60),
      clean_(p.questionNumber, 60),
      uid,
      clean_(p.topic, 160),
      stem,
      clean_(p.options, 8000),
      clean_(p.answerText && p.answerText.length ? p.answerText : p.answerIndexes, 3000),
      clean_(p.selectedText && p.selectedText.length ? p.selectedText : p.selectedIndexes, 3000),
      clean_(p.explanation, 8000),
      clean_(p.source, 3000),
      clean_(p.page, 80),
      comment,
      clean_(p.pageUrl, 1000),
      clean_(p.build, 200),
      clean_(p.userAgent, 1000)
    ];
    sheet.appendRow(row);

    const props = PropertiesService.getScriptProperties();
    const recipient = props.getProperty('REPORT_EMAIL') || Session.getEffectiveUser().getEmail();
    if (!recipient) {
      throw new Error('Set the REPORT_EMAIL script property to the email address that should receive reports.');
    }

    const label = clean_(p.bankLabel || p.bank, 120);
    const question = clean_(p.questionNumber, 60);
    const subject = '[MBU-NAP Question Report] ' + reason + ' · ' + label + (question ? ' Q' + question : '');
    const body = [
      'A classmate submitted a question report.',
      '',
      'Issue: ' + reason,
      'Reporter: ' + (clean_(p.reporter, 80) || 'Not provided'),
      'Bank: ' + label,
      'Set: ' + clean_(p.set, 60),
      'Question: ' + question,
      'UID: ' + uid,
      'Topic: ' + clean_(p.topic, 160),
      '',
      'Question:',
      stem,
      '',
      'Options:',
      clean_(p.options, 8000),
      '',
      'Keyed answer:',
      clean_(p.answerText && p.answerText.length ? p.answerText : p.answerIndexes, 3000),
      '',
      'Classmate comment:',
      comment,
      '',
      'Explanation:',
      clean_(p.explanation, 8000),
      '',
      'Source:',
      clean_(p.source, 3000),
      '',
      'Submitted from:',
      clean_(p.pageUrl, 1000),
      '',
      'Report sheet:',
      ss.getUrl()
    ].join('\n');

    MailApp.sendEmail({ to: recipient, subject, body });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
