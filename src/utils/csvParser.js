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

export async function fetchCSV(url) {
  if (!url) return { data: [], headers: [] };

  const cacheKey = `csv_cache_${url}`;
  const cacheTimeKey = `csv_cache_time_${url}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check cache
  try {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      }
    }
  } catch (e) {
    // Cache read failed, continue with fetch
  }

  // Fetch with retry
  let lastError;
  const delays = [0, 2000, 4000, 8000];
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const result = Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      if (!result.data || result.data.length === 0) {
        return { data: [], headers: [] };
      }

      // Clean numeric values — Issue #9: removed dead double-processing code
      // Preserve date columns as-is so "10/21/2025" isn't destroyed by parseFloat
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

      // Issue #17: Skip caching for large datasets (>5000 rows) to avoid localStorage quota
      try {
        if (data.length <= 5000) {
          localStorage.setItem(cacheKey, JSON.stringify(output));
          localStorage.setItem(cacheTimeKey, String(Date.now()));
        }
      } catch (e) {
        // localStorage full — clear stale caches and continue
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

  // All retries failed - try returning ANY cached data (even expired)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (import.meta.env.DEV) console.warn(`[csvParser] Fetch failed for ${url}, using stale cache`);
      return { ...JSON.parse(cached), stale: true };
    }
  } catch (e) {
    // No cache available
  }

  throw lastError;
}
