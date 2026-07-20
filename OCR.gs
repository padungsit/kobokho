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
  const lines = text.split(/\r?\n/);
  let currentContext = 'NONE'; // 'MEMBER' or 'GOV'
  
  let memberNumbers = [];
  let govNumbers = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Check for explicit section header matches
    // Note: Use 'จากภาครัฐ' or 'เงินจากภาครัฐ' to avoid matching 'หน่วยงานภาครัฐ' in disclaimer text
    if (/(?:เงินสะสมของท่าน|สะสมของท่าน|สะสมของ ท่า|สะสม ของท่าน|เงินสะสม)/i.test(trimmed)) {
      currentContext = 'MEMBER';
    } else if (/(?:เงินจากภาครัฐ|เงินจาก ภาครัฐ|เงินภาครัฐ|จากภาครัฐ)/i.test(trimmed)) {
      currentContext = 'GOV';
    }
    
    // Extract numbers in this line
    const matches = trimmed.match(/[\d,]+(?:\.\d{1,2})?/g) || [];
    const nums = matches
      .map(m => parseFloat(m.replace(/,/g, '')) || 0)
      .filter(n => n >= 100); // Filter out percentages (e.g. 20.8%, 16.4%, 30.2%, 32.6%)
      
    if (nums.length > 0 && currentContext !== 'NONE') {
      if (currentContext === 'MEMBER') {
        memberNumbers.push(...nums);
      } else if (currentContext === 'GOV') {
        govNumbers.push(...nums);
      }
    }
  });

  // Fallback: If line-by-line yielded empty, attempt global substring search
  if (memberNumbers.length === 0 && govNumbers.length === 0) {
    const normalizedText = text.replace(/[ \t]+/g, ' ');
    const memberStartIdx = normalizedText.search(/(?:เงินสะสมของท่าน|สะสมของท่าน|เงินสะสม)/i);
    const govStartIdx = normalizedText.search(/(?:เงินจากภาครัฐ|เงินจาก ภาครัฐ|เงินภาครัฐ|จากภาครัฐ)/i);
    
    const getNums = (sub) => {
      if (!sub) return [];
      const m = sub.match(/[\d,]+(?:\.\d{1,2})?/g) || [];
      return m.map(v => parseFloat(v.replace(/,/g, '')) || 0).filter(n => n >= 100);
    };

    if (memberStartIdx !== -1 && govStartIdx !== -1) {
      if (memberStartIdx < govStartIdx) {
        memberNumbers = getNums(normalizedText.substring(memberStartIdx, govStartIdx));
        govNumbers = getNums(normalizedText.substring(govStartIdx));
      } else {
        govNumbers = getNums(normalizedText.substring(govStartIdx, memberStartIdx));
        memberNumbers = getNums(normalizedText.substring(memberStartIdx));
      }
    }
  }

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
  const dateMatch = text.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
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
