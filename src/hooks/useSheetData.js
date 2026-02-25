import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSheet, resolveColumns } from '../utils/csvParser';
import { enrichGeneralData, aggregateConversionTypes, aggregateConversionsByDay } from '../utils/dataTransformers';

// Auto-refresh interval: 5 minutes (matches cache TTL)
const AUTO_REFRESH_MS = 5 * 60 * 1000;

// Token injected at build time from .env — never stored in source or localStorage
const PROXY_TOKEN = import.meta.env.VITE_PROXY_TOKEN || '';

/** Clear all sheet data caches from localStorage */
function clearSheetCaches() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('csv_cache_')) localStorage.removeItem(k);
    }
  } catch { /* localStorage unavailable (incognito, quota, etc.) */ }
}

export function useSheetData(config) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stale, setStale] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchAllData = useCallback(async () => {
    if (!config?.dataSources || !config?.proxyUrl) return;

    if (isFirstLoad.current) {
      setLoading(true);
    }

    const { dataSources: sources, proxyUrl } = config;
    const results = {};
    const errs = {};
    let anyStale = false;

    const entries = Object.entries(sources).filter(([, gid]) => gid);

    const settled = await Promise.allSettled(
      entries.map(async ([key, gid]) => {
        const result = await fetchSheet(proxyUrl, PROXY_TOKEN, gid);
        return { key, result };
      })
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { key, result } = outcome.value;
        if (result.stale) anyStale = true;

        if (key === 'general' && result.data.length > 0) {
          const colMap = result.colMap || resolveColumns(result.headers || []);
          result.data = enrichGeneralData(result.data, colMap);
          result.colMap = colMap;
        }

        if (key === 'conversionTypes' && result.data.length > 0) {
          const colMap = result.colMap || resolveColumns(result.headers || []);
          result.aggregated = aggregateConversionTypes(result.data, colMap);
          result.dailyTrend = aggregateConversionsByDay(result.data, colMap);
          result.colMap = colMap;
        }

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

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      clearSheetCaches();
      fetchAllData();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return { data, loading, errors, lastUpdated, stale, refresh: fetchAllData };
}
