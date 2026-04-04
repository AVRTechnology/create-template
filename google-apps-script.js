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

function ensureHeaders(sheet) {
  var headers = ['Record ID', 'Name', 'Mobile', 'Selfie URL', 'File Name', 'Created At'];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#FF6B00');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
}

function createRecordId(now) {
  return 'rec_' + now.getTime();
}

function addRecord(sheet, data) {
  var now = new Date();
  var recordId = data.recordId || createRecordId(now);
  var createdAt = data.createdAt || now.toISOString();

  sheet.appendRow([
    recordId,
    data.name || 'Unknown',
    data.mobile || 'Unknown',
    data.selfieUrl || '',
    data.fileName || '',
    createdAt
  ]);

  return {
    success: true,
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
      return { success: true, message: 'Record deleted', recordId: recordId, row: rowToDelete };
    }
  }

  return { success: false, error: 'Record not found', recordId: recordId };
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents || '{}');
    ensureHeaders(sheet);

    var action = (data.action || 'add').toLowerCase();
    var result;
    if (action === 'delete') {
      if (!data.recordId) {
        result = { success: false, error: 'recordId is required for delete action' };
      } else {
        result = deleteRecordById(sheet, data.recordId);
      }
    } else {
      result = addRecord(sheet, data);
    }

    sheet.autoResizeColumns(1, 6);

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
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeaders(sheet);
  var count = Math.max(0, sheet.getLastRow() - 1); // subtract header row
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'OK',
      message: 'Parshuram Shobhayatra API is running',
      totalRegistrations: count
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
