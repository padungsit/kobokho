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
    // Match numbers with optional decimal places (e.g. 195,279.80, 195279.8, 210501)
    const matches = sub.match(/[\d,]+(?:\.\d{1,2})?/g) || [];
    return matches
      .map(m => parseFloat(m.replace(/,/g, '')) || 0)
      .filter(n => n >= 100); // Filter out percentages like 20.8%, 16.4%, 30.2%, 32.6% or page numbers
  };

  // Split into Member and Gov parts based on headers
  let memberPart = '';
  let govPart = '';

  const memberStartIdx = normalizedText.search(/(?:เงินสะสมของท่าน|สะสมของท่าน|สะสมของ ท่า|สะสม ของท่าน|เงินสะสม)/i);
  const govStartIdx = normalizedText.search(/(?:เงินจากภาครัฐ|จากภาครัฐ|เงินภาครัฐ|เงิน จากภาครัฐ|เงินจาก ภาครัฐ|ภาครัฐ)/i);

  if (memberStartIdx !== -1 && govStartIdx !== -1) {
    if (memberStartIdx < govStartIdx) {
      memberPart = normalizedText.substring(memberStartIdx, govStartIdx);
      govPart = normalizedText.substring(govStartIdx);
    } else {
      govPart = normalizedText.substring(govStartIdx, memberStartIdx);
      memberPart = normalizedText.substring(memberStartIdx);
    }
  } else if (memberStartIdx !== -1) {
    memberPart = normalizedText.substring(memberStartIdx);
  } else if (govStartIdx !== -1) {
    govPart = normalizedText.substring(govStartIdx);
  } else {
    // Fallback: search globally if we couldn't split
    memberPart = normalizedText;
  }

  const memberNumbers = getNumbersInSubstring(memberPart);
  const govNumbers = getNumbersInSubstring(govPart);

  // Helper to extract Principal and Benefit from a list of numbers
  const parsePair = (nums) => {
    let principal = 0;
    let benefit = 0;
    if (nums.length >= 3) {
      // Index 0: Total, Index 1: Principal, Index 2: Benefit
      principal = nums[1];
      benefit = nums[2];
    } else if (nums.length === 2) {
      principal = nums[0];
      benefit = nums[1];
    } else if (nums.length === 1) {
      principal = nums[0];
    }
    return { principal, benefit };
  };

  const memberRes = parsePair(memberNumbers);
  const govRes = parsePair(govNumbers);

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
    MemberPrincipal: memberRes.principal,
    MemberBenefit: memberRes.benefit,
    GovPrincipal: govRes.principal,
    GovBenefit: govRes.benefit
  };
}
