function parseOCR(base64Image) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OCR_API_KEY') || getSetting('OCR_API_KEY') || 'K81464345588957';
  
  const payload = {
    apikey: apiKey,
    base64Image: base64Image,
    language: 'tha',
    ocrengine: '2',
    isOverlayRequired: false
  };
  
  const options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.ocr.space/parse/image', options);
    const json = JSON.parse(response.getContentText());
    if (json.IsErroredOnProcessing) {
      return { success: false, message: json.ErrorMessage[0] };
    }
    const text = json.ParsedResults[0].ParsedText;
    
    // Regex parsing logic for GPF Thai app
    return {
      success: true,
      text: text,
      parsed: extractGPFData(text)
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function extractGPFData(text) {
  // Clean up spaces to make keyword matching easier, but keep newlines
  const normalizedText = text.replace(/[ \t]+/g, ' ');

  const getNumbersInSubstring = (sub) => {
    if (!sub) return [];
    const matches = sub.match(/[\d,]+\.\d{2}/g) || [];
    return matches.map(m => parseFloat(m.replace(/,/g, '')) || 0);
  };

  // Split into Member and Gov parts based on headers
  let memberPart = '';
  let govPart = '';

  const memberStartIdx = normalizedText.search(/(?:เงินสะสมของท่าน|สะสมของท่าน|สะสมของ ท่า|สะสม ของท่าน)/i);
  const govStartIdx = normalizedText.search(/(?:เงินจากภาครัฐ|จากภาครัฐ|เงินภาครัฐ|เงิน จากภาครัฐ|เงินจาก ภาครัฐ)/i);

  if (memberStartIdx !== -1) {
    if (govStartIdx !== -1 && govStartIdx > memberStartIdx) {
      memberPart = normalizedText.substring(memberStartIdx, govStartIdx);
      govPart = normalizedText.substring(govStartIdx);
    } else {
      memberPart = normalizedText.substring(memberStartIdx);
    }
  } else {
    // Fallback: search globally if we couldn't split
    memberPart = normalizedText;
  }

  const memberNumbers = getNumbersInSubstring(memberPart);
  const govNumbers = getNumbersInSubstring(govPart);

  // In Member Part:
  // Index 0: Total (e.g. 298,496.81)
  // Index 1: Principal (e.g. 195,279.80)
  // Index 2: Benefit (e.g. 103,217.01)
  let memberPrincipal = 0;
  let memberBenefit = 0;
  
  if (memberNumbers.length >= 3) {
    memberPrincipal = memberNumbers[1];
    memberBenefit = memberNumbers[2];
  } else if (memberNumbers.length === 2) {
    memberPrincipal = memberNumbers[0];
    memberBenefit = memberNumbers[1];
  } else if (memberNumbers.length === 1) {
    memberPrincipal = memberNumbers[0];
  }

  // In Gov Part:
  // Index 0: Total (e.g. 341,935.89)
  // Index 1: Principal (e.g. 210,501.00)
  // Index 2: Benefit (e.g. 131,434.89)
  let govPrincipal = 0;
  let govBenefit = 0;
  
  if (govNumbers.length >= 3) {
    govPrincipal = govNumbers[1];
    govBenefit = govNumbers[2];
  } else if (govNumbers.length === 2) {
    govPrincipal = govNumbers[0];
    govBenefit = govNumbers[1];
  } else if (govNumbers.length === 1) {
    govPrincipal = govNumbers[0];
  }

  // Attempt to parse Date (e.g., DD/MM/YYYY)
  let dateStr = new Date().toISOString().split('T')[0];
  const dateMatch = normalizedText.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
  if (dateMatch) {
    let day = parseInt(dateMatch[1]);
    let month = parseInt(dateMatch[2]);
    let year = parseInt(dateMatch[3]);
    if (year > 2500) year -= 543; // Convert Buddhist year
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    dateStr = `${year}-${mm}-${dd}`;
  }

  return {
    Date: dateStr,
    MemberPrincipal: memberPrincipal,
    MemberBenefit: memberBenefit,
    GovPrincipal: govPrincipal,
    GovBenefit: govBenefit
  };
}
