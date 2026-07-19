function getSnapshots(token) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  let snaps = getSheetData('SNAPSHOTS');
  if (auth.user.Role === 'User') {
    snaps = snaps.filter(s => s.UserID === auth.user.UserID);
  }
  
  // Sort chronologically to calculate profit difference
  snaps.sort((a, b) => new Date(a.Date) - new Date(b.Date));
  
  for (let i = 0; i < snaps.length; i++) {
    const current = snaps[i];
    const previous = i > 0 ? snaps[i-1] : null;
    current.DailyProfit = previous ? (parseFloat(current.Profit) - parseFloat(previous.Profit)) : 0;
  }
  
  // Sort back in descending order for table view
  snaps.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  
  return snaps;
}

function deleteSnapshot(token, snapId) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('SNAPSHOTS');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(r => r[0] === snapId);
  if (rowIndex > 0) {
    // Check ownership if User
    if (auth.user.Role === 'User' && data[rowIndex][1] !== auth.user.UserID) {
      throw new Error("Unauthorized");
    }
    sheet.deleteRow(rowIndex + 1);
    logAction(auth.user.Username, 'Snapshot', 'Delete', 'Success', 'Deleted snapshot ' + snapId);
    return { success: true };
  }
  return { success: false };
}

function updateSnapshot(token, snapId, data) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('SNAPSHOTS');
  const values = sheet.getDataRange().getValues();
  const rowIndex = values.findIndex(r => r[0] === snapId);
  if (rowIndex > 0) {
    // Check ownership if User
    if (auth.user.Role === 'User' && values[rowIndex][1] !== auth.user.UserID) {
      throw new Error("Unauthorized");
    }
    
    // Calculate totals
    const MemberAmount = parseFloat(data.MemberPrincipal) + parseFloat(data.MemberBenefit);
    const GovAmount = parseFloat(data.GovPrincipal) + parseFloat(data.GovBenefit);
    const TotalAmount = MemberAmount + GovAmount;
    const TotalPrincipal = parseFloat(data.MemberPrincipal) + parseFloat(data.GovPrincipal);
    const TotalBenefit = parseFloat(data.MemberBenefit) + parseFloat(data.GovBenefit);
    const Profit = TotalBenefit;
    const Yield = (TotalPrincipal > 0) ? (Profit / TotalPrincipal) * 100 : 0;
    
    const rowNum = rowIndex + 1;
    sheet.getRange(rowNum, 3).setValue(data.Date); // Date
    sheet.getRange(rowNum, 4).setValue(TotalAmount); // TotalAmount
    sheet.getRange(rowNum, 5).setValue(MemberAmount); // MemberAmount
    sheet.getRange(rowNum, 6).setValue(data.MemberPrincipal); // MemberPrincipal
    sheet.getRange(rowNum, 7).setValue(data.MemberBenefit); // MemberBenefit
    sheet.getRange(rowNum, 8).setValue(GovAmount); // GovAmount
    sheet.getRange(rowNum, 9).setValue(data.GovPrincipal); // GovPrincipal
    sheet.getRange(rowNum, 10).setValue(data.GovBenefit); // GovBenefit
    sheet.getRange(rowNum, 11).setValue(TotalPrincipal); // TotalPrincipal
    sheet.getRange(rowNum, 12).setValue(TotalBenefit); // TotalBenefit
    sheet.getRange(rowNum, 13).setValue(Profit); // Profit
    sheet.getRange(rowNum, 14).setValue(Yield); // Yield
    sheet.getRange(rowNum, 18).setValue(new Date().toISOString()); // EditDate (18th column)
    
    logAction(auth.user.Username, 'Snapshot', 'Update', 'Success', 'Updated snapshot ' + snapId);
    return { success: true };
  }
  return { success: false, message: 'ไม่พบข้อมูลที่ต้องการแก้ไข' };
}

