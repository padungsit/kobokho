function saveSnapshot(token, data) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('SNAPSHOTS');
  const values = sheet.getDataRange().getValues();
  
  // Check for duplicate date for the same user (fast row iteration)
  // Column 2 (index 1) is UserID, Column 3 (index 2) is Date
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowUserId = row[1];
    let rowDate = row[2];
    
    if (rowDate instanceof Date) {
      try {
        rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } catch(e) {
        try {
          rowDate = rowDate.toISOString().split('T')[0];
        } catch(err) {
          rowDate = rowDate.toString();
        }
      }
    }
    
    if (rowUserId === auth.user.UserID && rowDate === data.Date) {
      const dateParts = data.Date.split('-');
      let displayDate = data.Date;
      if (dateParts.length === 3) {
        displayDate = dateParts[2] + '/' + dateParts[1] + '/' + (parseInt(dateParts[0]) + 543);
      }
      throw new Error("คุณได้บันทึกข้อมูลของวันที่ " + displayDate + " ไปแล้ว ไม่สามารถบันทึกซ้ำได้");
    }
  }
  
  // Calculate totals
  const TotalPrincipal = parseFloat(data.MemberPrincipal) + parseFloat(data.GovPrincipal);
  const TotalBenefit = parseFloat(data.MemberBenefit) + parseFloat(data.GovBenefit);
  const Profit = TotalBenefit;
  const Yield = (TotalPrincipal > 0) ? (Profit / TotalPrincipal) * 100 : 0;
  
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 18).setValues([[
    id,
    auth.user.UserID,
    data.Date,
    data.TotalAmount,
    data.MemberAmount,
    data.MemberPrincipal,
    data.MemberBenefit,
    data.GovAmount,
    data.GovPrincipal,
    data.GovBenefit,
    TotalPrincipal,
    TotalBenefit,
    Profit,
    Yield,
    '', // OCRText (Don't store)
    '', // ImageFile
    now,
    now
  ]]);
  
  logAction(auth.user.Username, 'Upload', 'SaveSnapshot', 'Success', 'Saved Snapshot ' + data.Date);
  return { success: true };
}
