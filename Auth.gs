function login(username, password) {
  const users = getSheetData('USERS');
  const pwdHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8));
  
  const user = users.find(u => u.Username === username && u.PasswordHash === pwdHash && u.Status === 'Active');
  if (user) {
    // Update last login
    const db = getDb();
    const sheet = db.getSheetByName('USERS');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(r => r[1] === username);
    if(rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 9).setValue(new Date().toISOString()); // LastLogin column
    }
    
    const token = Utilities.getUuid();
    CacheService.getUserCache().put(token, JSON.stringify(user), 21600); // 6 hours
    
    logAction(username, 'Login', 'Login', 'Success', 'User logged in');
    return { success: true, token: token, user: user };
  }
  logAction(username, 'Login', 'Login', 'Failed', 'Invalid credentials');
  return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' };
}

function checkAuth(token) {
  const cached = CacheService.getUserCache().get(token);
  if (cached) {
    return { success: true, user: JSON.parse(cached) };
  }
  return { success: false };
}

function logout(token) {
  CacheService.getUserCache().remove(token);
  return { success: true };
}
