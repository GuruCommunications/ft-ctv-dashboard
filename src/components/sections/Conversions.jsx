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

  // Conversion pixel breakdown (pre-aggregated)
  const pixelData = useMemo(() => {
    const ct = sheetData?.conversionTypes;
    if (!ct?.aggregated?.length) return [];
    return ct.aggregated.slice(0, 20);
  }, [sheetData?.conversionTypes]);

  // Daily conversion trend from ConversionTypes
  const pixelDailyTrend = sheetData?.conversionTypes?.dailyTrend || [];

  // Single filter pass for both province and channel aggregations
  const { convByProvince, convByChannel } = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return { convByProvince: [], convByChannel: [] };
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);

    const byProv = {};
    const byCh = {};
    for (const row of filtered) {
      const conv = getNumericField(row, colMap, 'conversions');
      const prov = row._parsed?.province || 'Unknown';
      const ch = row._parsed?.channelType || 'Unknown';
      byProv[prov] = (byProv[prov] || 0) + conv;
      byCh[ch] = (byCh[ch] || 0) + conv;
    }

    return {
      convByProvince: Object.entries(byProv)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      convByChannel: Object.entries(byCh)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
    };
  }, [sheetData?.general, filters]);

  const hasAnyData = dailyTrend.length > 0 || pixelData.length > 0 || convByProvince.length > 0;
  if (!hasAnyData) return <EmptyState message="No conversion data available" />;

  const pixelTableCols = [
    { key: 'pixel', label: 'Conversion Pixel' },
    { key: 'count', label: 'Count', align: 'right', render: v => formatNumber(v) },
    { key: 'firstConversion', label: 'First Seen', render: v => v ? formatDate(v) : '\u2014' },
    { key: 'lastConversion', label: 'Last Seen', render: v => v ? formatDate(v) : '\u2014' },
  ];

  return (
    <div className="space-y-12">
      {dailyTrend.length > 0 && (
        <TrendChart data={dailyTrend} lines={[{ key: 'conversions', label: 'Daily Conversions' }]} xKey="date" title="Daily Conversions Trend" branding={branding} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        {convByProvince.length > 0 && (
          <BarChartComponent data={convByProvince} bars={[{ key: 'value', label: 'Conversions' }]} xKey="name" title="Conversions by Province" branding={branding} colorPerBar />
        )}
        {convByChannel.length > 0 && (
          <DonutChart data={convByChannel} title="Conversions by Channel Type" branding={branding} />
        )}
      </div>

      {pixelData.length > 0 && (
        <>
          <BarChartComponent
            data={pixelData.slice(0, 10).map(p => ({ name: p.pixel.length > 40 ? p.pixel.substring(0, 40) + '...' : p.pixel, count: p.count }))}
            bars={[{ key: 'count', label: 'Conversions' }]}
            xKey="name" title="Conversions by Pixel" layout="horizontal"
            height={Math.max(300, Math.min(pixelData.length, 10) * 35)}
            branding={branding} colorPerBar
          />
          <DataTable data={pixelData} columns={pixelTableCols} title="Conversion Pixel Breakdown" defaultSort={{ key: 'count', direction: 'desc' }} />
        </>
      )}

      {pixelDailyTrend.length > 0 && (
        <TrendChart data={pixelDailyTrend} lines={[{ key: 'count', label: 'Conversions' }]} xKey="date" title="Conversion Pixel Daily Trend" branding={branding} />
      )}
    </div>
  );
}
