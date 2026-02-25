// ─── Column alias map ───
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

// ─── Value cleaning ───
function cleanValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  const cleaned = str.replace(/[$,]/g, '');
  if (str.endsWith('%')) {
    const num = parseFloat(str.replace('%', ''));
    return isNaN(num) ? str : num / 100;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? str : num;
}

// ─── Field accessors ───
// Data is pre-cleaned during fetch, so getNumericField only does a type check.
export function getNumericField(row, colMap, alias) {
  const colName = colMap[alias];
  if (!colName) return 0;
  const val = row[colName];
  if (val == null) return 0;
  return typeof val === 'number' ? val : 0;
}

/** Compute VCR: prefer the raw VCR column, fall back to completions/starts */
export function computeVCR(row, colMap) {
  const vcrVal = getNumericField(row, colMap, 'vcr');
  if (vcrVal > 0) return vcrVal;
  const starts = getNumericField(row, colMap, 'videoStarts');
  const comps = getNumericField(row, colMap, 'videoCompletions');
  return starts > 0 ? comps / starts : 0;
}

/** Aggregate a metric by a dimension key across filtered rows */
export function aggregateByDimension(rows, colMap, dimensionFn, metricAlias) {
  const agg = {};
  for (const row of rows) {
    const key = dimensionFn(row);
    agg[key] = (agg[key] || 0) + getNumericField(row, colMap, metricAlias);
  }
  return Object.entries(agg)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

// ─── 2D array → row objects ───
function arrayToRows(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return { data: [], headers: [] };
  const headers = arr[0].map(h => String(h).trim());
  const data = [];
  for (let i = 1; i < arr.length; i++) {
    const row = arr[i];
    if (!row || row.every(cell => cell === '' || cell == null)) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = j < row.length ? row[j] : null;
      if (val === '') val = null;
      obj[headers[j]] = val;
    }
    data.push(obj);
  }
  return { data, headers };
}

/** Clear all sheet data caches from localStorage */
function clearSheetCaches() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('csv_cache_')) localStorage.removeItem(k);
    }
  } catch { /* localStorage unavailable */ }
}

// ─── Fetch from Apps Script proxy ───
export async function fetchSheet(proxyUrl, token, gid) {
  const url = `${proxyUrl}?token=${encodeURIComponent(token)}&gid=${gid}`;
  const cacheKey = `csv_cache_${gid}`;
  const cacheTimeKey = `csv_cache_time_${gid}`;
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check cache
  try {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch { /* cache read failed, continue */ }

  // Fetch with exponential backoff
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
      const skipClean = new Set(
        [colMap.date, colMap.timeOfConversion].filter(Boolean)
      );
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

      // Cache (skip very large datasets)
      try {
        if (data.length <= 5000) {
          localStorage.setItem(cacheKey, JSON.stringify(output));
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch {
        clearSheetCaches();
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
  } catch { /* no cache available */ }

  throw lastError;
}
