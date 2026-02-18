import { useMemo } from 'react';
import { getNumericField } from '../utils/csvParser';
import { filterData } from './useFilters';

// Issue #14: Narrow dependency to sheetData.general instead of entire sheetData
export function useDerivedMetrics(sheetData, filters) {
  const general = sheetData?.general;
  return useMemo(() => {
    if (!general?.data?.length) {
      return {
        totalSpend: 0,
        totalImpressions: 0,
        totalVideoCompletions: 0,
        totalVideoStarts: 0,
        overallVCR: 0,
        totalConversions: 0,
        costPerConversion: 0,
        cpm: 0,
        cpcv: 0,
        filteredData: [],
      };
    }

    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalVideoCompletions = 0;
    let totalVideoStarts = 0;
    let totalConversions = 0;

    for (const row of filtered) {
      totalSpend += getNumericField(row, colMap, 'cost');
      totalImpressions += getNumericField(row, colMap, 'impressions');
      totalVideoCompletions += getNumericField(row, colMap, 'videoCompletions');
      totalVideoStarts += getNumericField(row, colMap, 'videoStarts');
      totalConversions += getNumericField(row, colMap, 'conversions');
    }

    const overallVCR = totalVideoStarts > 0 ? totalVideoCompletions / totalVideoStarts : 0;
    const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpcv = totalVideoCompletions > 0 ? totalSpend / totalVideoCompletions : 0;

    return {
      totalSpend,
      totalImpressions,
      totalVideoCompletions,
      totalVideoStarts,
      overallVCR,
      totalConversions,
      costPerConversion,
      cpm,
      cpcv,
      filteredData: filtered,
    };
  }, [general, filters]);
}
