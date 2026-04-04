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

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Mobile', 'Selfie URL', 'File Name', 'Date']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 6).setBackground('#FF6B00');
      sheet.getRange(1, 1, 1, 6).setFontColor('white');
    }
    
    var now = new Date();
    var dateStr = now.toLocaleDateString('en-IN', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    
    sheet.appendRow([
      data.timestamp || now.toISOString(),
      data.name || 'Unknown',
      data.mobile || 'Unknown',
      data.selfieUrl || '',
      data.fileName || '',
      dateStr
    ]);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 6);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Registration saved!',
        row: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
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
  var count = Math.max(0, sheet.getLastRow() - 1); // subtract header row
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: 'OK',
      message: 'Parshuram Shobhayatra API is running',
      totalRegistrations: count
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
