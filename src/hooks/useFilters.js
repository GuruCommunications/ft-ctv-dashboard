import { useState, useCallback, useMemo, useEffect } from 'react';

function getInitialFilters() {
  if (typeof window === 'undefined') return { provinces: [], channelTypes: [], dateRange: [null, null] };

  const params = new URLSearchParams(window.location.search);
  return {
    provinces: params.get('provinces') ? params.get('provinces').split(',') : [],
    channelTypes: params.get('channels') ? params.get('channels').split(',') : [],
    dateRange: [
      params.get('from') || null,
      params.get('to') || null,
    ],
  };
}

export function useFilters() {
  const [filters, setFilters] = useState(getInitialFilters);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.provinces.length > 0) params.set('provinces', filters.provinces.join(','));
    if (filters.channelTypes.length > 0) params.set('channels', filters.channelTypes.join(','));
    if (filters.dateRange[0]) params.set('from', filters.dateRange[0]);
    if (filters.dateRange[1]) params.set('to', filters.dateRange[1]);

    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [filters]);

  const setProvinces = useCallback((provinces) => {
    setFilters(f => ({ ...f, provinces }));
  }, []);

  const setChannelTypes = useCallback((channelTypes) => {
    setFilters(f => ({ ...f, channelTypes }));
  }, []);

  const setDateRange = useCallback((dateRange) => {
    setFilters(f => ({ ...f, dateRange }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ provinces: [], channelTypes: [], dateRange: [null, null] });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.provinces.length > 0 || filters.channelTypes.length > 0 || filters.dateRange[0] || filters.dateRange[1];
  }, [filters]);

  return {
    filters,
    setProvinces,
    setChannelTypes,
    setDateRange,
    clearFilters,
    hasActiveFilters,
  };
}

// Filter data based on active filters
// Issue #4: Rows without _parsed pass province/channel filters (non-general sheets)
// Issue #19: Use YYYY-MM-DD string comparison to avoid timezone offset bugs
export function filterData(data, filters, colMap) {
  if (!data || data.length === 0) return data;

  const hasProvinceFilter = filters.provinces.length > 0;
  const hasChannelFilter = filters.channelTypes.length > 0;
  const hasDateFrom = !!filters.dateRange[0];
  const hasDateTo = !!filters.dateRange[1];

  // Fast path — no filters active
  if (!hasProvinceFilter && !hasChannelFilter && !hasDateFrom && !hasDateTo) return data;

  return data.filter(row => {
    // Province filter — only apply when row has _parsed data
    if (hasProvinceFilter && row._parsed) {
      if (!filters.provinces.includes(row._parsed.province)) return false;
    }

    // Channel type filter — only apply when row has _parsed data
    if (hasChannelFilter && row._parsed) {
      if (!filters.channelTypes.includes(row._parsed.channelType)) return false;
    }

    // Date range filter — use string comparison to avoid TZ issues
    if (hasDateFrom || hasDateTo) {
      const dateCol = colMap?.date;
      if (dateCol && row[dateCol] != null) {
        let rowDateStr = null;
        const raw = row[dateCol];
        if (raw instanceof Date) {
          rowDateStr = raw.toISOString().split('T')[0];
        } else {
          const num = typeof raw === 'number' ? raw : NaN;
          const d = !isNaN(num) && num > 40000 && num < 60000
            ? new Date((num - 25569) * 86400000)
            : new Date(String(raw));
          if (!isNaN(d.getTime())) {
            rowDateStr = d.toISOString().split('T')[0];
          }
        }
        if (rowDateStr) {
          if (hasDateFrom && rowDateStr < filters.dateRange[0]) return false;
          if (hasDateTo && rowDateStr > filters.dateRange[1]) return false;
        }
      }
    }

    return true;
  });
}
