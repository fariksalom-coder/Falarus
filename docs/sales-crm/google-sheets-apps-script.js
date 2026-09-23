/**
 * Google Apps Script — paste into the LEADS spreadsheet:
 * Extensions → Apps Script
 *
 * 1) SCRIPT PROPERTIES (Project settings → Script properties):
 *    FALARUS_WEBHOOK_URL    = https://falarus.uz/api/integrations/google-sheets/lead
 *    FALARUS_WEBHOOK_SECRET = <same as server GOOGLE_SHEETS_WEBHOOK_SECRET>
 *    FALARUS_BULK_URL       = https://falarus.uz/api/integrations/google-sheets/leads
 *      (optional; defaults to /lead → /leads)
 *
 * 2) Run backfillAllRows() ONCE to import all existing 40+ rows.
 * 3) Run installTrigger() for new rows going forward.
 *
 * Sheet stays PRIVATE. Only Apps Script (as the sheet owner) reads it.
 */

/** Fallback indexes if header auto-detect fails (0-based). */
const COLUMN_FALLBACK = {
  firstName: 0,
  lastName: 1,
  phone: 2,
  source: 3,
  submittedAt: 4,
  externalId: -1,
};

function props_() {
  const p = PropertiesService.getScriptProperties();
  const leadUrl = String(p.getProperty('FALARUS_WEBHOOK_URL') || '').trim();
  return {
    url: leadUrl,
    bulkUrl:
      String(p.getProperty('FALARUS_BULK_URL') || '').trim() ||
      (leadUrl ? leadUrl.replace(/\/lead\/?$/, '/leads') : ''),
    secret: String(p.getProperty('FALARUS_WEBHOOK_SECRET') || '').trim(),
  };
}

function normHeader_(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[ё]/g, 'е');
}

/** Detect columns from row 1 headers. */
function detectColumns_(headers) {
  const cols = {
    firstName: COLUMN_FALLBACK.firstName,
    lastName: COLUMN_FALLBACK.lastName,
    phone: COLUMN_FALLBACK.phone,
    source: COLUMN_FALLBACK.source,
    submittedAt: COLUMN_FALLBACK.submittedAt,
    externalId: COLUMN_FALLBACK.externalId,
  };
  let foundPhone = false;
  headers.forEach(function (h, i) {
    const n = normHeader_(h);
    if (n.includes('ism') || n.includes('имя') || n.includes('first') || n === 'name') {
      cols.firstName = i;
    }
    if (n.includes('famili') || n.includes('фамилия') || n.includes('last') || n.includes('surname')) {
      cols.lastName = i;
    }
    if (
      n.includes('phone') ||
      n.includes('telefon') ||
      n.includes('телефон') ||
      n.includes('номер') ||
      n === 'tel'
    ) {
      cols.phone = i;
      foundPhone = true;
    }
    if (n.includes('source') || n.includes('manba') || n.includes('источник')) {
      cols.source = i;
    }
    if (
      n.includes('date') ||
      n.includes('time') ||
      n.includes('sana') ||
      n.includes('дата') ||
      n.includes('время')
    ) {
      cols.submittedAt = i;
    }
    if (n === 'id' || n.includes('lead_id') || n.includes('заявк')) {
      cols.externalId = i;
    }
  });
  if (!foundPhone) {
    console.warn('Phone column not found in headers, using fallback index', cols.phone);
  }
  return cols;
}

function cell_(row, idx) {
  if (idx < 0 || idx == null) return '';
  const v = row[idx];
  if (v instanceof Date) return v.toISOString();
  return v == null ? '' : String(v).trim();
}

function rowPayload_(row, rowNumber, cols) {
  return {
    rowNumber: rowNumber,
    firstName: cell_(row, cols.firstName),
    lastName: cell_(row, cols.lastName),
    phone: cell_(row, cols.phone),
    source: cell_(row, cols.source) || 'google_sheets',
    submittedAt: cell_(row, cols.submittedAt) || new Date().toISOString(),
    externalId: cell_(row, cols.externalId) || null,
    medium: 'apps_script',
  };
}

function postJson_(url, secret, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Falarus-Sheets-Secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

/** Call when a new row is appended (Installable onChange). */
function onSheetChange(e) {
  try {
    if (!e || !e.source) return;
    if (e.changeType && e.changeType !== 'INSERT_ROW' && e.changeType !== 'EDIT') return;
    const sheet = e.source.getActiveSheet();
    const row = sheet.getActiveRange().getRow();
    if (row < 2) return;
    sendRow_(sheet, row);
  } catch (err) {
    console.error(err);
  }
}

function sendRow_(sheet, rowNumber) {
  const { url, secret } = props_();
  if (!url || !secret) {
    console.warn('FALARUS_WEBHOOK_URL / SECRET missing');
    return;
  }
  const width = Math.max(sheet.getLastColumn(), 5);
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  const cols = detectColumns_(headers);
  const values = sheet.getRange(rowNumber, 1, 1, width).getValues()[0];
  const result = postJson_(url, secret, rowPayload_(values, rowNumber, cols));
  console.log('row', rowNumber, result.code, result.body);
}

/**
 * ONE-SHOT: import ALL existing rows into CRM (40+).
 * Run from Apps Script editor → select backfillAllRows → Run.
 * Duplicates are skipped safely.
 */
function backfillAllRows() {
  const { bulkUrl, secret } = props_();
  if (!bulkUrl || !secret) {
    throw new Error('Set FALARUS_WEBHOOK_URL and FALARUS_WEBHOOK_SECRET in Script properties');
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const last = sheet.getLastRow();
  const width = Math.max(sheet.getLastColumn(), 5);
  if (last < 2) {
    console.log('No data rows');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, width).getValues()[0];
  const cols = detectColumns_(headers);
  console.log('Detected columns', JSON.stringify(cols), 'headers', headers);

  const values = sheet.getRange(2, 1, last - 1, width).getValues();
  const leads = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row || !row.some(function (c) { return String(c || '').trim(); })) continue;
    leads.push(rowPayload_(row, i + 2, cols));
  }

  console.log('Sending', leads.length, 'leads…');

  // Chunk by 80 to stay under Apps Script / server limits
  const chunkSize = 80;
  let totalNew = 0;
  let totalDup = 0;
  let totalErr = 0;
  for (let i = 0; i < leads.length; i += chunkSize) {
    const chunk = leads.slice(i, i + chunkSize);
    const result = postJson_(bulkUrl, secret, { leads: chunk });
    console.log('chunk', i / chunkSize + 1, result.code, result.body);
    if (result.code >= 200 && result.code < 300) {
      try {
        const j = JSON.parse(result.body);
        totalNew += Number(j.newLeads || 0);
        totalDup += Number(j.duplicates || 0);
        totalErr += Number(j.errors || 0);
      } catch (e) {
        /* ignore parse */
      }
    } else {
      totalErr += chunk.length;
    }
    Utilities.sleep(300);
  }

  console.log('DONE new=' + totalNew + ' dup=' + totalDup + ' err=' + totalErr);
  try {
    SpreadsheetApp.getUi().alert(
      'CRM sync: new=' + totalNew + ', duplicates=' + totalDup + ', errors=' + totalErr,
    );
  } catch (e) {
    /* editor run without UI */
  }
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetChange').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
}
