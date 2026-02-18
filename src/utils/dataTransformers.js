// Parse Line Item Names into dimensions
export function parseLIName(liName, ioName) {
  const result = {
    channelType: 'Unknown',
    targeting: 'Unknown',
    province: 'Unknown',
    dealType: null,
    environment: null,
  };

  if (!liName && !ioName) return result;

  // Channel Type — from IO Name
  if (ioName) {
    const io = String(ioName);
    if (io.includes('ATV-CTV RT') || io.includes('ATV - CTV RT') || io.includes('RT - DISP')) {
      result.channelType = 'Retargeting';
    } else if (io.includes('ATV') && io.includes('CTV')) {
      result.channelType = 'CTV';
    } else if (io.includes('UpF') && io.includes('OLV')) {
      result.channelType = 'OLV';
    } else if (io.includes('OLV')) {
      result.channelType = 'OLV';
    } else if (io.includes('CTV')) {
      result.channelType = 'CTV';
    } else if (io.includes('Display') || io.includes('DISP')) {
      result.channelType = 'Display';
    }
  }

  if (!liName) return result;
  const li = String(liName);

  // Targeting Strategy — from LI Name prefix
  const targetingPatterns = [
    [/^FSA\s*\{?\s*ACR\s*\}?/i, 'Underexposed Linear TV'],
    [/^FSA\s*-\s*ToVid.*LTV.*Amazon/i, 'FSA - Amazon LTV'],
    [/^RT\s*-\s*CTV\s*Ads/i, 'CTV Retargeting'],
    [/^CT\s*-\s*Sports\s*&?\s*News/i, 'Contextual - Sports & News'],
    [/^CT\s*\{?\s*Comscore\s*\}?/i, 'Contextual - Comscore'],
    [/^CT\s*\{?\s*Webbula\s*\}?/i, 'Contextual - Webbula'],
    [/^CT\s*-\s*Site\s*Inclusion/i, 'Contextual - Site Inclusion'],
    [/^CT\s*-\s*KW\s*List/i, 'Contextual - Keyword List'],
    [/^BT\s*-\s*Vehicle\s*Owners/i, 'Behavioral - Vehicle Owners'],
    [/^BT\s*-\s*Service/i, 'Behavioral - Service/Maintenance'],
    [/^BT\s*-\s*Amazon\s*Car/i, 'Behavioral - Amazon Car InMarket'],
    [/^LAL\s*-\s*Booking/i, 'Lookalike - Booking Confirmation'],
    [/^LAL\s*-\s*Universal/i, 'Lookalike - Universal'],
    [/^LAL\s*-\s*Promotions/i, 'Lookalike - Promotions LP'],
    [/^Geof\s*RT/i, 'Geofence Retargeting'],
    [/^PMP\s*-\s*Local\s*News/i, 'PMP - Local News'],
  ];

  for (const [pattern, label] of targetingPatterns) {
    if (pattern.test(li)) {
      result.targeting = label;
      break;
    }
  }

  // Issue #12: Expanded province patterns including eastern provinces
  const provincePatterns = [
    [/[-–]\s*AB\s*$/i, 'AB'],
    [/[-–]\s*BC\s*$/i, 'BC'],
    [/[-–]\s*ON\s*$/i, 'ON'],
    [/[-–]\s*SK\s*&?\s*MB\s*&?\s*YUK\s*$/i, 'SK&MB&YUK'],
    [/[-–]\s*MB\s*\/?\s*SK\s*\/?\s*YUK\s*$/i, 'SK&MB&YUK'],
    [/[-–]\s*SK\s*$/i, 'SK&MB&YUK'],
    [/[-–]\s*MB\s*$/i, 'SK&MB&YUK'],
    [/[-–]\s*QC\s*$/i, 'QC'],
    [/[-–]\s*NS\s*$/i, 'NS'],
    [/[-–]\s*NB\s*$/i, 'NB'],
    [/[-–]\s*PE(?:I)?\s*$/i, 'PEI'],
    [/[-–]\s*NL\s*$/i, 'NL'],
    [/[-–]\s*NT\s*$/i, 'NT'],
    [/[-–]\s*NU\s*$/i, 'NU'],
    [/[-–]\s*YT\s*$/i, 'YT'],
  ];

  for (const [pattern, label] of provincePatterns) {
    if (pattern.test(li)) {
      result.province = label;
      break;
    }
  }

  // Deal Type
  if (/All\s*Deals/i.test(li)) result.dealType = 'Open Exchange';
  else if (/Premium\s*PMP/i.test(li)) result.dealType = 'Private Marketplace';
  else if (/\bX\s*-/i.test(li)) result.dealType = 'Exchange';

  // Environment
  if (/Web\s*\/?\s*App/i.test(li)) result.environment = 'Web & App';
  else if (/\bWeb\b/i.test(li)) result.environment = 'Web';
  else if (/\bApp\b/i.test(li)) result.environment = 'App';

  return result;
}

// Parse a date that might be in various formats
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  // Try MM/DD/YYYY — validate month 1-12 to catch DD/MM/YYYY anomalies
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    let month = parseInt(mdyMatch[1]);
    let day = parseInt(mdyMatch[2]);
    const year = parseInt(mdyMatch[3]);

    // If month > 12, it's likely DD/MM/YYYY — swap day and month
    if (month > 12 && day <= 12) {
      [month, day] = [day, month];
    } else if (month > 12) {
      return null; // Both > 12 is invalid
    }

    const d = new Date(year, month - 1, day);
    // Verify the date didn't overflow (e.g. Feb 30 → Mar 2)
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return isNaN(d.getTime()) ? null : d;
  }

  // Try Google Sheets serial number (days since Dec 30, 1899)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  // Try general Date parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Aggregate conversion types (for 30K+ row datasets)
export function aggregateConversionTypes(data, colMap) {
  const pixelCol = colMap.conversionPixel;
  const timeCol = colMap.timeOfConversion;
  if (!pixelCol) return [];

  const agg = {};
  for (const row of data) {
    const pixel = row[pixelCol];
    if (!pixel) continue;

    if (!agg[pixel]) {
      agg[pixel] = { pixel, count: 0, firstConversion: null, lastConversion: null };
    }
    agg[pixel].count++;

    if (timeCol && row[timeCol]) {
      const date = parseDate(row[timeCol]);
      if (date) {
        if (!agg[pixel].firstConversion || date < agg[pixel].firstConversion) {
          agg[pixel].firstConversion = date;
        }
        if (!agg[pixel].lastConversion || date > agg[pixel].lastConversion) {
          agg[pixel].lastConversion = date;
        }
      }
    }
  }

  return Object.values(agg).sort((a, b) => b.count - a.count);
}

// Aggregate daily conversions from ConversionsTypes
export function aggregateConversionsByDay(data, colMap) {
  const timeCol = colMap.timeOfConversion;
  if (!timeCol) return [];

  const daily = {};
  for (const row of data) {
    const date = parseDate(row[timeCol]);
    if (!date) continue;
    const key = date.toISOString().split('T')[0];
    daily[key] = (daily[key] || 0) + 1;
  }

  return Object.entries(daily)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Enrich general data with parsed dimensions
export function enrichGeneralData(data, colMap) {
  const liNameCol = colMap.liName;
  const ioNameCol = colMap.ioName;

  return data.map(row => ({
    ...row,
    _parsed: parseLIName(
      liNameCol ? row[liNameCol] : null,
      ioNameCol ? row[ioNameCol] : null
    ),
  }));
}

// Province label mapping — Issue #12: expanded
export const PROVINCE_LABELS = {
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'ON': 'Ontario',
  'SK&MB&YUK': 'SK/MB/YUK',
  'QC': 'Quebec',
  'NS': 'Nova Scotia',
  'NB': 'New Brunswick',
  'PEI': 'Prince Edward Island',
  'NL': 'Newfoundland & Labrador',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut',
  'YT': 'Yukon',
};

export function getProvinceLabel(code) {
  return PROVINCE_LABELS[code] || code;
}
