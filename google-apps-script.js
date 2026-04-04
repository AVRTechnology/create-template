/**
 * PARSHURAM SHOBHAYATRA - Google Apps Script
 * 
 * HOW TO USE:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Paste this entire code
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL
 * 6. Add it to Vercel as GOOGLE_SHEET_URL environment variable
 */

var BASE_HEADERS = ['ID', 'Name', 'Mobile', 'Image URL'];
var LEGACY_HEADERS = ['Timestamp', 'Photo Status', 'Date', 'Selfie URL', 'File Name', 'Created At', 'Record ID'];

function getExistingExtraHeaders(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  var headerRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var extras = [];
  for (var i = 0; i < headerRow.length; i++) {
    var header = String(headerRow[i] || '').trim();
    if (!header) continue;
    if (BASE_HEADERS.indexOf(header) !== -1) continue;
    if (LEGACY_HEADERS.indexOf(header) !== -1) continue;
    extras.push(header);
  }
  return extras;
}

function buildHeaders(sheet, extraFields) {
  var headers = BASE_HEADERS.slice();
  var existingExtras = getExistingExtraHeaders(sheet);
  for (var i = 0; i < existingExtras.length; i++) {
    if (headers.indexOf(existingExtras[i]) === -1) headers.push(existingExtras[i]);
  }

  if (extraFields && typeof extraFields === 'object') {
    var extraKeys = Object.keys(extraFields);
    for (var j = 0; j < extraKeys.length; j++) {
      var key = String(extraKeys[j] || '').trim();
      if (!key) continue;
      if (headers.indexOf(key) === -1) headers.push(key);
    }
  }

  return headers;
}

function migrateLegacyRowsIfNeeded(sheet, headers) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return;

  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var hasLegacyTimestamp = currentHeaders.indexOf('Timestamp') !== -1;
  var hasLegacyPhotoStatus = currentHeaders.indexOf('Photo Status') !== -1;
  if (!hasLegacyTimestamp && !hasLegacyPhotoStatus) return;

  var timestampIdx = currentHeaders.indexOf('Timestamp');
  var nameIdx = currentHeaders.indexOf('Name');
  var mobileIdx = currentHeaders.indexOf('Mobile');
  var imageUrlIdx = currentHeaders.indexOf('Image URL');
  var selfieUrlIdx = currentHeaders.indexOf('Selfie URL');

  var migratedRows = [];
  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rawTs = timestampIdx >= 0 ? row[timestampIdx] : '';
      var tsMillis = new Date(rawTs).getTime();
      if (!isFinite(tsMillis)) tsMillis = Date.now() + i;
      var recordId = 'rec_' + tsMillis;
      var imageUrl = '';
      if (imageUrlIdx >= 0 && row[imageUrlIdx]) imageUrl = row[imageUrlIdx];
      if (!imageUrl && selfieUrlIdx >= 0 && row[selfieUrlIdx]) imageUrl = row[selfieUrlIdx];

      migratedRows.push([
        recordId,
        nameIdx >= 0 ? row[nameIdx] : '',
        mobileIdx >= 0 ? row[mobileIdx] : '',
        imageUrl
      ]);
    }
  }

  sheet.clearContents();
  ensureHeaders(sheet, headers);
  if (migratedRows.length > 0) {
    sheet.getRange(2, 1, migratedRows.length, BASE_HEADERS.length).setValues(migratedRows);
  }
}

function ensureHeaders(sheet, headers) {
  var totalColumns = Math.max(sheet.getMaxColumns(), headers.length);
  if (sheet.getMaxColumns() < totalColumns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), totalColumns - sheet.getMaxColumns());
  }

  var fullHeaderRow = [];
  for (var i = 0; i < totalColumns; i++) {
    fullHeaderRow.push(i < headers.length ? headers[i] : '');
  }

  sheet.getRange(1, 1, 1, totalColumns).setValues([fullHeaderRow]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#FF6B00');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
}

function createRecordId(now) {
  return 'rec_' + now.getTime();
}

function addRecord(sheet, data, headers) {
  var now = new Date();
  var recordId = data.recordId || createRecordId(now);
  var extraFields = (data.extraFields && typeof data.extraFields === 'object') ? data.extraFields : {};
  var rowMap = {
    'ID': recordId,
    'Name': data.name || 'Unknown',
    'Mobile': data.mobile || 'Unknown',
    'Image URL': data.selfieUrl || ''
  };

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (Object.prototype.hasOwnProperty.call(rowMap, header)) {
      row.push(rowMap[header]);
    } else if (Object.prototype.hasOwnProperty.call(extraFields, header)) {
      row.push(extraFields[header]);
    } else {
      row.push('');
    }
  }

  sheet.appendRow(row);

  return {
    success: true,
    schemaVersion: 2,
    action: 'add',
    message: 'Registration saved!',
    recordId: recordId,
    row: sheet.getLastRow()
  };
}

function deleteRecordById(sheet, recordId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: false, error: 'No records found' };
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(recordId)) {
      var rowToDelete = i + 2;
      sheet.deleteRow(rowToDelete);
      return { success: true, schemaVersion: 2, action: 'delete', message: 'Record deleted', recordId: recordId, row: rowToDelete };
    }
  }

  return { success: false, schemaVersion: 2, action: 'delete', error: 'Record not found', recordId: recordId };
}

function normalizeMobileForMatch(m) {
  if (m === null || m === undefined) return '';
  return String(m).replace(/\D/g, '');
}

/** Column index (0-based) for header name; trims cells; case-insensitive. */
function headerColumnIndex(headers, canonicalName) {
  var want = String(canonicalName || '').trim().toLowerCase();
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === want) {
      return i;
    }
  }
  return -1;
}

/**
 * Same mobile → update first matching row; extra duplicate rows for that mobile are deleted.
 * New mobile → append row (same as addRecord).
 */
function upsertRecord(sheet, data, headers) {
  var mobileNorm = normalizeMobileForMatch(data.mobile);
  var mobileColIdx = headerColumnIndex(headers, 'Mobile');
  if (mobileColIdx < 0) {
    throw new Error('Mobile column missing');
  }
  var mobileCol = mobileColIdx + 1;

  var nameColIdx = headerColumnIndex(headers, 'Name');
  var imgColIdx = headerColumnIndex(headers, 'Image URL');
  var idColIdx = headerColumnIndex(headers, 'ID');

  var lastRow = sheet.getLastRow();
  var matchingRows = [];
  if (lastRow > 1) {
    var mobileValues = sheet.getRange(2, mobileCol, lastRow, mobileCol).getValues();
    for (var i = 0; i < mobileValues.length; i++) {
      if (normalizeMobileForMatch(mobileValues[i][0]) === mobileNorm) {
        matchingRows.push(i + 2);
      }
    }
  }

  if (matchingRows.length === 0) {
    return addRecord(sheet, data, headers);
  }

  matchingRows.sort(function (a, b) {
    return a - b;
  });
  var keepRow = matchingRows[0];
  for (var k = matchingRows.length - 1; k >= 1; k--) {
    sheet.deleteRow(matchingRows[k]);
  }

  var previousImageUrl = '';
  if (imgColIdx >= 0) {
    previousImageUrl = String(sheet.getRange(keepRow, imgColIdx + 1).getValue() || '');
  }
  if (nameColIdx >= 0) {
    sheet.getRange(keepRow, nameColIdx + 1).setValue(data.name || '');
  }
  if (imgColIdx >= 0) {
    sheet.getRange(keepRow, imgColIdx + 1).setValue(data.selfieUrl || '');
  }
  var recordId = idColIdx >= 0 ? String(sheet.getRange(keepRow, idColIdx + 1).getValue() || '') : '';
  return {
    success: true,
    schemaVersion: 2,
    action: 'update',
    message: 'Registration updated!',
    recordId: recordId,
    row: keepRow,
    previousImageUrl: previousImageUrl,
    duplicatesRemoved: matchingRows.length - 1
  };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Sheet is busy — try again in a moment'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents || '{}');
    var headers = buildHeaders(sheet, data.extraFields);
    migrateLegacyRowsIfNeeded(sheet, headers);
    ensureHeaders(sheet, headers);

    var action = (data.action || 'add').toLowerCase();
    var result;
    if (action === 'delete') {
      if (!data.recordId) {
        result = { success: false, error: 'recordId is required for delete action' };
      } else {
        result = deleteRecordById(sheet, data.recordId);
      }
    } else if (action === 'upsert') {
      result = upsertRecord(sheet, data, headers);
    } else {
      result = addRecord(sheet, data, headers);
    }

    sheet.autoResizeColumns(1, headers.length);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('Error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = buildHeaders(sheet, null);
  migrateLegacyRowsIfNeeded(sheet, headers);
  ensureHeaders(sheet, headers);
  var count = Math.max(0, sheet.getLastRow() - 1); // subtract header row
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      schemaVersion: 2,
      status: 'OK',
      message: 'Parshuram Shobhayatra API is running',
      totalRegistrations: count
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
