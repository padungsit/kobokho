function getSettings(token) {
  const auth = checkAuth(token);
  if (!auth.success || auth.user.Role !== 'SuperAdmin') throw new Error("Unauthorized");
  return getSheetData('CONFIG');
}

function saveSetting(token, key, value) {
  const auth = checkAuth(token);
  if (!auth.success || auth.user.Role !== 'SuperAdmin') throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('CONFIG');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(r => r[0] === key);
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex + 1, 2).setValue(value);
  } else {
    sheet.appendRow([key, value]);
  }
  
  if (key === 'OCR_API_KEY') {
    PropertiesService.getScriptProperties().setProperty('OCR_API_KEY', value);
  }
  
  logAction(auth.user.Username, 'Setting', 'Update', 'Success', 'Updated setting ' + key);
  return { success: true };
}

function getSetting(key) {
  const data = getSheetData('CONFIG');
  const setting = data.find(s => s.Key === key);
  return setting ? setting.Value : null;
}

function generateMockData(token) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  const db = getDb();
  const sheet = db.getSheetByName('SNAPSHOTS');
  const data = sheet.getDataRange().getValues();
  
  // Clear existing snapshots for this user
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][1] === auth.user.UserID) {
      sheet.deleteRow(i + 1);
    }
  }
  
  const baseDate = new Date();
  
  // Insert 5 days of growing mock data ending with screenshot values
  for (let i = 4; i >= 0; i--) {
    const date = new Date();
    date.setDate(baseDate.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // Linear scaling back from screenshot values
    const decFactor = i * 1500;
    const decBenFactor = i * 800;
    const decGovFactor = i * 2000;
    const decGovBenFactor = i * 1000;
    
    const memberPrincipal = 195279.80 - decFactor;
    const memberBenefit = 103217.01 - decBenFactor;
    const govPrincipal = 210501.00 - decGovFactor;
    const govBenefit = 131434.89 - decGovBenFactor;
    
    const memberAmount = memberPrincipal + memberBenefit;
    const govAmount = govPrincipal + govBenefit;
    const totalAmount = memberAmount + govAmount;
    
    const TotalPrincipal = memberPrincipal + govPrincipal;
    const TotalBenefit = memberBenefit + govBenefit;
    const Profit = TotalBenefit;
    const Yield = (TotalPrincipal > 0) ? (Profit / TotalPrincipal) * 100 : 0;
    
    const id = Utilities.getUuid();
    const now = new Date().toISOString();
    
    sheet.appendRow([
      id,
      auth.user.UserID,
      dateString,
      totalAmount,
      memberAmount,
      memberPrincipal,
      memberBenefit,
      govAmount,
      govPrincipal,
      govBenefit,
      TotalPrincipal,
      TotalBenefit,
      Profit,
      Yield,
      'Mock Data',
      '',
      now,
      now
    ]);
  }
  
  logAction(auth.user.Username, 'Setting', 'GenerateMock', 'Success', 'Generated 5 days mock data');
  return { success: true };
}
