function getUsers(token) {
  const auth = checkAuth(token);
  if (!auth.success || auth.user.Role !== 'SuperAdmin') throw new Error("Unauthorized");
  return getSheetData('USERS');
}

function saveUser(token, userData) {
  const auth = checkAuth(token);
  if (!auth.success || auth.user.Role !== 'SuperAdmin') throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  
  if (userData.UserID) {
    // Update
    const rowIndex = data.findIndex(r => r[0] === userData.UserID);
    if (rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 4).setValue(userData.Name);
      sheet.getRange(rowIndex + 1, 5).setValue(userData.Department);
      sheet.getRange(rowIndex + 1, 6).setValue(userData.Position);
      sheet.getRange(rowIndex + 1, 7).setValue(userData.Role);
      sheet.getRange(rowIndex + 1, 8).setValue(userData.Status);
      if (userData.Password) {
         const pwdHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, userData.Password, Utilities.Charset.UTF_8));
         sheet.getRange(rowIndex + 1, 3).setValue(pwdHash);
      }
      logAction(auth.user.Username, 'User', 'Update', 'Success', 'Updated user ' + userData.Username);
      return { success: true };
    }
  } else {
    // Insert
    const pwdHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, userData.Password || '123456', Utilities.Charset.UTF_8));
    sheet.appendRow([
      Utilities.getUuid(),
      userData.Username,
      pwdHash,
      userData.Name,
      userData.Department,
      userData.Position,
      userData.Role,
      'Active',
      '',
      new Date().toISOString()
    ]);
    logAction(auth.user.Username, 'User', 'Create', 'Success', 'Created user ' + userData.Username);
    return { success: true };
  }
  return { success: false, message: 'User not found' };
}

function deleteUser(token, userId) {
  const auth = checkAuth(token);
  if (!auth.success || auth.user.Role !== 'SuperAdmin') throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(r => r[0] === userId);
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    logAction(auth.user.Username, 'User', 'Delete', 'Success', 'Deleted user ' + userId);
    return { success: true };
  }
  return { success: false };
}

function registerUser(userData) {
  const db = getDb();
  const sheet = db.getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  
  // Check if username exists
  const exists = data.some(r => r[1] === userData.Username);
  if (exists) {
    return { success: false, message: 'มีชื่อผู้ใช้งานนี้อยู่ในระบบแล้ว' };
  }
  
  const pwdHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, userData.Password, Utilities.Charset.UTF_8));
  sheet.appendRow([
    Utilities.getUuid(),
    userData.Username,
    pwdHash,
    userData.Name,
    '-', // Department
    '-', // Position
    'User', // Role
    'Inactive',
    '',
    new Date().toISOString()
  ]);
  
  logAction(userData.Username, 'User', 'Register', 'Success', 'User registered');
  return { success: true };
}
