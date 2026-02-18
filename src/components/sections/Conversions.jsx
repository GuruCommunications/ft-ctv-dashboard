import { useMemo } from 'react';
import TrendChart from '../charts/TrendChart';
import BarChartComponent from '../charts/BarChart';
import DonutChart from '../charts/DonutChart';
import DataTable from '../charts/DataTable';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatDate } from '../../utils/formatters';
import { getNumericField } from '../../utils/csvParser';
import { filterData } from '../../hooks/useFilters';
import { parseDate } from '../../utils/dataTransformers';

export default function Conversions({ sheetData, filters, branding }) {
  // Daily conversions trend from DailyConversions sheet
  const dailyTrend = useMemo(() => {
    const daily = sheetData?.dailyConversions;
    if (!daily?.data?.length) return [];
    const colMap = daily.colMap;
    const filtered = filterData(daily.data, filters, colMap);
    const dateCol = colMap.date;
    const convCol = colMap.conversions;
    if (!dateCol) return [];

    const agg = {};
    for (const row of filtered) {
      const d = parseDate(row[dateCol]);
      if (!d) continue;
      const key = d.toISOString().split('T')[0];
      const conv = convCol ? (typeof row[convCol] === 'number' ? row[convCol] : 0) : 0;
      agg[key] = (agg[key] || 0) + conv;
    }

    return Object.entries(agg)
      .map(([date, conversions]) => ({ date, conversions }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sheetData?.dailyConversions, filters]);

  // Conversion pixel breakdown (pre-aggregated) — Issue #15: narrow deps
  const pixelData = useMemo(() => {
    const ct = sheetData?.conversionTypes;
    if (!ct?.aggregated?.length) return [];
    return ct.aggregated.slice(0, 20);
  }, [sheetData?.conversionTypes]);

  // Daily conversion trend from ConversionTypes
  const pixelDailyTrend = useMemo(() => {
    const ct = sheetData?.conversionTypes;
    if (!ct?.dailyTrend?.length) return [];
    return ct.dailyTrend;
  }, [sheetData?.conversionTypes]);

  // Conversions by Province — Issue #15: narrow deps
  const convByProvince = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const agg = {};
    for (const row of filtered) {
      const prov = row._parsed?.province || 'Unknown';
      agg[prov] = (agg[prov] || 0) + getNumericField(row, colMap, 'conversions');
    }
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sheetData?.general, filters]);

  // Conversions by Channel
  const convByChannel = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const agg = {};
    for (const row of filtered) {
      const ch = row._parsed?.channelType || 'Unknown';
      agg[ch] = (agg[ch] || 0) + getNumericField(row, colMap, 'conversions');
    }
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sheetData?.general, filters]);

  const hasAnyData = dailyTrend.length > 0 || pixelData.length > 0 || convByProvince.length > 0;
  if (!hasAnyData) return <EmptyState message="No conversion data available" />;

  const pixelTableCols = [
    { key: 'pixel', label: 'Conversion Pixel' },
    { key: 'count', label: 'Count', align: 'right', render: v => formatNumber(v) },
    { key: 'firstConversion', label: 'First Seen', render: v => v ? formatDate(v) : '—' },
    { key: 'lastConversion', label: 'Last Seen', render: v => v ? formatDate(v) : '—' },
  ];

  return (
    <div className="space-y-12">
      {/* Daily trend */}
      {dailyTrend.length > 0 && (
        <TrendChart
          data={dailyTrend}
          lines={[{ key: 'conversions', label: 'Daily Conversions' }]}
          xKey="date"
          title="Daily Conversions Trend"
          branding={branding}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        {/* By Province */}
        {convByProvince.length > 0 && (
          <BarChartComponent
            data={convByProvince}
            bars={[{ key: 'value', label: 'Conversions' }]}
            xKey="name"
            title="Conversions by Province"
            branding={branding}
            colorPerBar
          />
        )}

        {/* By Channel */}
        {convByChannel.length > 0 && (
          <DonutChart
            data={convByChannel}
            title="Conversions by Channel Type"
            branding={branding}
          />
        )}
      </div>

      {/* Pixel breakdown */}
      {pixelData.length > 0 && (
        <>
          <BarChartComponent
            data={pixelData.slice(0, 10).map(p => ({ name: p.pixel.length > 40 ? p.pixel.substring(0, 40) + '...' : p.pixel, count: p.count }))}
            bars={[{ key: 'count', label: 'Conversions' }]}
            xKey="name"
            title="Conversions by Pixel"
            layout="horizontal"
            height={Math.max(300, Math.min(pixelData.length, 10) * 35)}
            branding={branding}
            colorPerBar
          />
          <DataTable
            data={pixelData}
            columns={pixelTableCols}
            title="Conversion Pixel Breakdown"
            defaultSort={{ key: 'count', direction: 'desc' }}
          />
        </>
      )}

      {/* Pixel daily trend */}
      {pixelDailyTrend.length > 0 && (
        <TrendChart
          data={pixelDailyTrend}
          lines={[{ key: 'count', label: 'Conversions' }]}
          xKey="date"
          title="Conversion Pixel Daily Trend"
          branding={branding}
        />
      )}
    </div>
  );
}
