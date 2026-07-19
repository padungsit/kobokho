function doGet(e) {
  const template = HtmlService.createTemplateFromFile('GASIndex');
  template.url = ScriptApp.getService().getUrl();
  return template.evaluate()
    .setTitle('ระบบติดตามกำไร กบข.')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const functionName = request.functionName;
    const args = request.arguments || [];
    
    if (typeof globalThis[functionName] !== 'function') {
      throw new Error("Function " + functionName + " not found or is not executable.");
    }
    
    const result = globalThis[functionName].apply(null, args);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

