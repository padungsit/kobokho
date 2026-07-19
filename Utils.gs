let cachedDb = null;
function getDb() {
  if (cachedDb) return cachedDb;
  const dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
  if (!dbId) {
    throw new Error('Database not initialized. Please run initSetup().');
  }
  cachedDb = SpreadsheetApp.openById(dbId);
  return cachedDb;
}

function getSheetData(sheetName) {
  const db = getDb();
  const sheet = db.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        // Format as YYYY-MM-DD safely in local script timezone (prevents timezone offset day shift)
        try {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } catch(e) {
          try {
            val = val.toISOString().split('T')[0];
          } catch(err) {
            val = val.toString();
          }
        }
      }
      obj[h] = val;
    });
    return obj;
  });
}

function logAction(username, menu, action, status, details) {
  try {
    const db = getDb();
    const sheet = db.getSheetByName('LOGS');
    const lastRow = sheet.getLastRow();
    
    // Write log directly using setValues (faster than appendRow)
    sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[new Date(), username, menu, action, status, details, '']]);
    
    // Auto-cleanup: keep LOGS sheet size under control (delete oldest 500 rows if size > 1500)
    if (lastRow > 1500) {
      sheet.deleteRows(2, 500);
    }
  } catch(e) {
    console.error('Log error', e);
  }
}
