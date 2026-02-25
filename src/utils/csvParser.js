import Papa from 'papaparse';

// Fuzzy column name matching
const COLUMN_ALIASES = {
  impressions: ['Impressions', 'Imps', 'impressions', 'imps'],
  cost: ['Cost', 'Spend', 'cost', 'spend'],
  conversions: ['Total Conversions', 'Conversions', 'Conv', 'conversions', 'total_conversions'],
  videoStarts: ['Video Starts', 'video_starts', 'Video starts'],
  videoComplete50: ['50% Video Complete', '50% Video Completion', 'video_complete_50'],
  videoCompletions: ['Video Completions', 'video_completions', 'Video completions'],
  vcr: ['Video Completion Rate %', 'VCR', 'VCR %', 'vcr', 'Video Completion Rate'],
  clicks: ['Clicks', 'clicks'],
  date: ['Day2', 'Date', 'day', 'date', 'Day'],
  ioId: ['IO Id', 'IO ID', 'io_id', 'IO id'],
  ioName: ['IO Name', 'IO name', 'io_name'],
  liId: ['LI Id', 'LI ID', 'li_id', 'LI id'],
  liName: ['LI Name', 'LI name', 'li_name'],
  segment: ['Segment', 'segment'],
  creative: ['Creative', 'creative'],
  ctvSupplier: ['CTV Supplier', 'ctv_supplier', 'Supplier'],
  conversionPixel: ['Conversion Pixel', 'conversion_pixel', 'Pixel'],
  timeOfConversion: ['Time of Conversion', 'time_of_conversion', 'Conversion Time'],
  advertiser: ['Advertiser', 'advertiser'],
  tvImpressions: ['TV Impressions', 'tv_impressions', 'LTV Impressions'],
  reach: ['Reach', 'reach'],
  frequency: ['Frequency', 'frequency'],
  topStations: ['Top linear TV Stations', 'Station', 'Stations', 'Top Stations'],
  audienceShare: ['Audience Share', 'audience_share'],
  populationShare: ['Population Share', 'population_share'],
  index: ['Index', 'index'],
  ltvImpressions: ['LTV Impressions', 'ltv_impressions', 'TV Impressions'],
};

export function resolveColumn(headers, alias) {
  const candidates = COLUMN_ALIASES[alias] || [alias];
  for (const candidate of candidates) {
    if (headers.includes(candidate)) return candidate;
  }
  // Try case-insensitive match
  const lowerCandidates = candidates.map(c => c.toLowerCase());
  for (const header of headers) {
    if (lowerCandidates.includes(header.toLowerCase())) return header;
  }
  return null;
}

export function resolveColumns(headers) {
  const map = {};
  for (const alias of Object.keys(COLUMN_ALIASES)) {
    map[alias] = resolveColumn(headers, alias);
  }
  return map;
}

function cleanValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  // Strip currency symbols and commas
  const cleaned = str.replace(/[$,]/g, '');
  // Handle percentage
  if (str.endsWith('%')) {
    const num = parseFloat(str.replace('%', ''));
    return isNaN(num) ? str : num / 100;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? str : num;
}

function getFieldValue(row, colMap, alias) {
  const colName = colMap[alias];
  if (!colName) return null;
  return row[colName] != null ? row[colName] : null;
}

export function getNumericField(row, colMap, alias) {
  const val = getFieldValue(row, colMap, alias);
  if (val == null) return 0;
  const cleaned = cleanValue(val);
  return typeof cleaned === 'number' ? cleaned : 0;
}

// Convert a 2D array (from Apps Script proxy) to row objects
function arrayToRows(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return { data: [], headers: [] };
  const headers = arr[0].map(h => String(h).trim());
  const data = [];
  for (let i = 1; i < arr.length; i++) {
    const row = arr[i];
    // Skip empty rows
    if (!row || row.every(cell => cell === '' || cell == null)) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = j < row.length ? row[j] : null;
      // Apps Script serializes Date objects as ISO strings — preserve as-is
      // Numbers come through as actual numbers — no cleaning needed
      if (val === '') val = null;
      obj[headers[j]] = val;
    }
    data.push(obj);
  }
  return { data, headers };
}

// Fetch data from the Apps Script proxy (JSON 2D array response)
export async function fetchSheet(proxyUrl, token, gid) {
  const url = `${proxyUrl}?token=${encodeURIComponent(token)}&gid=${gid}`;
  const cacheKey = `csv_cache_${gid}`;
  const cacheTimeKey = `csv_cache_time_${gid}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check cache
  try {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch { /* Cache read failed, continue with fetch */ }

  // Fetch with retry
  let lastError;
  const delays = [0, 2000, 4000, 8000];
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      if (json.error) throw new Error(json.error);
      if (!Array.isArray(json) || json.length < 2) return { data: [], headers: [] };

      const { data: rawData, headers } = arrayToRows(json);
      const colMap = resolveColumns(headers);

      // Preserve date/time columns as-is; clean everything else
      const dateColName = colMap.date;
      const timeColName = colMap.timeOfConversion;
      const skipClean = new Set([dateColName, timeColName].filter(Boolean));

      const data = rawData.map(row => {
        const cleaned = { ...row };
        for (const key of Object.keys(cleaned)) {
          if (typeof cleaned[key] === 'string' && !skipClean.has(key)) {
            cleaned[key] = cleanValue(cleaned[key]);
          }
        }
        return cleaned;
      });

      const output = { data, headers, colMap };

      // Cache (skip large datasets)
      try {
        if (data.length <= 5000) {
          localStorage.setItem(cacheKey, JSON.stringify(output));
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k?.startsWith('csv_cache_')) localStorage.removeItem(k);
          }
        } catch { /* ignore */ }
      }

      return output;
    } catch (e) {
      lastError = e;
    }
  }

  // All retries failed — try stale cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (import.meta.env.DEV) console.warn(`[csvParser] Fetch failed for gid=${gid}, using stale cache`);
      return { ...JSON.parse(cached), stale: true };
    }
  } catch { /* No cache available */ }

  throw lastError;
}

// Legacy: Fetch from direct CSV URL (kept as fallback)
export async function fetchCSV(url) {
  if (!url) return { data: [], headers: [] };

  const cacheKey = `csv_cache_${url}`;
  const cacheTimeKey = `csv_cache_time_${url}`;
  const CACHE_DURATION = 5 * 60 * 1000;

  try {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch { /* continue */ }

  let lastError;
  const delays = [0, 2000, 4000, 8000];
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const result = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });

      if (!result.data || result.data.length === 0) return { data: [], headers: [] };

      const headers = result.meta.fields || [];
      const colMap = resolveColumns(headers);
      const dateColName = colMap.date;
      const timeColName = colMap.timeOfConversion;
      const skipClean = new Set([dateColName, timeColName].filter(Boolean));

      const data = result.data.map(row => {
        const cleaned = { ...row };
        for (const key of Object.keys(cleaned)) {
          if (typeof cleaned[key] === 'string' && !skipClean.has(key)) {
            cleaned[key] = cleanValue(cleaned[key]);
          }
        }
        return cleaned;
      });

      const output = { data, headers, colMap };

      try {
        if (data.length <= 5000) {
          localStorage.setItem(cacheKey, JSON.stringify(output));
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k?.startsWith('csv_cache_')) localStorage.removeItem(k);
          }
        } catch { /* ignore */ }
      }

      return output;
    } catch (e) {
      lastError = e;
    }
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (import.meta.env.DEV) console.warn(`[csvParser] Fetch failed for ${url}, using stale cache`);
      return { ...JSON.parse(cached), stale: true };
    }
  } catch { /* No cache */ }

  throw lastError;
}
