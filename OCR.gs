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
  // Extract all numbers >= 100
  const matches = text.match(/[\d,]+(?:\.\d{1,2})?/g) || [];
  const numbers = matches
    .map(m => parseFloat(m.replace(/,/g, '')) || 0)
    .filter(n => n >= 100);

  let memberPrincipal = 0;
  let memberBenefit = 0;
  let govPrincipal = 0;
  let govBenefit = 0;

  // Find all valid (Total, Principal, Benefit) triplets in sequence
  // Mathematical rule: P + B approx equals T (within 1.0 margin)
  const triplets = [];
  for (let i = 0; i < numbers.length - 2; i++) {
    const t = numbers[i];
    const p = numbers[i + 1];
    const b = numbers[i + 2];
    if (Math.abs((p + b) - t) < 1.0 && p > 0 && b > 0) {
      triplets.push({ total: t, principal: p, benefit: b });
    }
  }

  if (triplets.length >= 2) {
    // First triplet is Member, Second triplet is Gov
    memberPrincipal = triplets[0].principal;
    memberBenefit = triplets[0].benefit;
    govPrincipal = triplets[1].principal;
    govBenefit = triplets[1].benefit;
  } else if (triplets.length === 1) {
    memberPrincipal = triplets[0].principal;
    memberBenefit = triplets[0].benefit;
  } else {
    // Fallback: If no triplets matched (e.g. totals omitted), use positional sequence indexing
    if (numbers.length >= 7) {
      memberPrincipal = numbers[2];
      memberBenefit = numbers[3];
      govPrincipal = numbers[5];
      govBenefit = numbers[6];
    } else if (numbers.length === 6) {
      memberPrincipal = numbers[1];
      memberBenefit = numbers[2];
      govPrincipal = numbers[4];
      govBenefit = numbers[5];
    } else if (numbers.length === 4) {
      memberPrincipal = numbers[0];
      memberBenefit = numbers[1];
      govPrincipal = numbers[2];
      govBenefit = numbers[3];
    }
  }

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
    MemberPrincipal: memberPrincipal,
    MemberBenefit: memberBenefit,
    GovPrincipal: govPrincipal,
    GovBenefit: govBenefit
  };
}
