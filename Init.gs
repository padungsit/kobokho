function initSetup() {
  const props = PropertiesService.getScriptProperties();
  let dbId = props.getProperty('DB_ID');
  
  if (!dbId) {
    const ss = SpreadsheetApp.create('GPF Tracker Database');
    dbId = ss.getId();
    props.setProperty('DB_ID', dbId);
    
    // Create tabs
    const sheets = ['USERS', 'SNAPSHOTS', 'CONFIG', 'LOGS'];
    sheets.forEach(name => {
      if (!ss.getSheetByName(name)) {
        ss.insertSheet(name);
      }
    });
    const sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่นที่ 1');
    if (sheet1) ss.deleteSheet(sheet1);
    
    // Setup Headers
    const userSheet = ss.getSheetByName('USERS');
    userSheet.appendRow(['UserID', 'Username', 'PasswordHash', 'Name', 'Department', 'Position', 'Role', 'Status', 'LastLogin', 'CreatedAt']);
    
    // Default Admin (admin/admin)
    const pwdHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'admin', Utilities.Charset.UTF_8));
    userSheet.appendRow([Utilities.getUuid(), 'admin', pwdHash, 'admin', '-', '-', 'SuperAdmin', 'Active', '', new Date().toISOString()]);
    
    const snapSheet = ss.getSheetByName('SNAPSHOTS');
    snapSheet.appendRow(['ID', 'UserID', 'Date', 'TotalAmount', 'MemberAmount', 'MemberPrincipal', 'MemberBenefit', 'GovAmount', 'GovPrincipal', 'GovBenefit', 'TotalPrincipal', 'TotalBenefit', 'Profit', 'Yield', 'OCRText', 'ImageFile', 'UploadDate', 'EditDate']);
    
    const configSheet = ss.getSheetByName('CONFIG');
    configSheet.appendRow(['Key', 'Value']);
    configSheet.appendRow(['OCR_API_KEY', 'K81464345588957']);
    configSheet.appendRow(['SYSTEM_NAME', 'ระบบติดตามกำไร กบข.']);
    configSheet.appendRow(['VERSION', '1.0.0']);
    configSheet.appendRow(['THEME', 'light']);
    
    const logSheet = ss.getSheetByName('LOGS');
    logSheet.appendRow(['Timestamp', 'Username', 'Menu', 'Action', 'Status', 'Details', 'IP']);
    
    return 'Database created successfully. ID: ' + dbId;
  }
  return 'Database already exists. ID: ' + dbId;
}

function bytesToHex(bytes) {
  return bytes.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}
