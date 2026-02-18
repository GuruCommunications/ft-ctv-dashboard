import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCSV, resolveColumns } from '../utils/csvParser';
import { enrichGeneralData, aggregateConversionTypes, aggregateConversionsByDay } from '../utils/dataTransformers';

// Auto-refresh interval: 5 minutes (matches cache TTL)
const AUTO_REFRESH_MS = 5 * 60 * 1000;

export function useSheetData(config) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stale, setStale] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchAllData = useCallback(async () => {
    if (!config?.dataSources) return;

    // Only show full loading spinner on first load, not background refreshes
    if (isFirstLoad.current) {
      setLoading(true);
    }
    const sources = config.dataSources;
    const results = {};
    const errs = {};
    let anyStale = false;

    const entries = Object.entries(sources).filter(([, url]) => url);

    const settled = await Promise.allSettled(
      entries.map(async ([key, url]) => {
        const result = await fetchCSV(url);
        return { key, result };
      })
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { key, result } = outcome.value;
        if (result.stale) anyStale = true;

        // Issue #28: Only enrich general data (it has LI Name/IO Name columns)
        // dailyConversions doesn't have those columns, so enrichment is wasteful
        if (key === 'general' && result.data.length > 0) {
          const colMap = result.colMap || resolveColumns(result.headers || []);
          result.data = enrichGeneralData(result.data, colMap);
          result.colMap = colMap;
        }

        // Pre-aggregate conversion types
        if (key === 'conversionTypes' && result.data.length > 0) {
          const colMap = result.colMap || resolveColumns(result.headers || []);
          result.aggregated = aggregateConversionTypes(result.data, colMap);
          result.dailyTrend = aggregateConversionsByDay(result.data, colMap);
          result.colMap = colMap;
        }

        // Resolve columns for all datasets
        if (result.data.length > 0 && !result.colMap) {
          result.colMap = resolveColumns(result.headers || []);
        }

        results[key] = result;
      } else {
        errs[entries.find((_, i) => settled[i] === outcome)?.[0] || 'unknown'] = outcome.reason?.message || 'Fetch failed';
      }
    }

    setData(results);
    setErrors(errs);
    setStale(anyStale);
    setLastUpdated(new Date());
    setLoading(false);
    isFirstLoad.current = false;
  }, [config]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh every 5 minutes so the dashboard stays current
  useEffect(() => {
    const interval = setInterval(() => {
      // Clear the localStorage cache so we get fresh data
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k?.startsWith('csv_cache_')) localStorage.removeItem(k);
        }
      } catch { /* ignore */ }
      fetchAllData();
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  return { data, loading, errors, lastUpdated, stale, refresh: fetchAllData };
}
