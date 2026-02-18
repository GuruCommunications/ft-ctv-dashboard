import { useMemo } from 'react';
import { DollarSign, Eye, PlayCircle, Target, TrendingUp, Monitor } from 'lucide-react';
import KPICard from '../charts/KPICard';
import DonutChart from '../charts/DonutChart';
import BarChartComponent from '../charts/BarChart';
import TrendChart from '../charts/TrendChart';
import EmptyState from '../ui/EmptyState';
import { formatCurrency, formatNumber, formatPercent, formatDecimal } from '../../utils/formatters';
import { getNumericField } from '../../utils/csvParser';
import { filterData } from '../../hooks/useFilters';
import { parseDate } from '../../utils/dataTransformers';

export default function Overview({ metrics, sheetData, filters, branding }) {
  const { totalSpend, totalImpressions, totalVideoCompletions, overallVCR, totalConversions, costPerConversion, cpm, cpcv } = metrics;

  // Spend by Channel Type — Issue #15: narrow deps
  const spendByChannel = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const agg = {};
    for (const row of filtered) {
      const channel = row._parsed?.channelType || 'Unknown';
      agg[channel] = (agg[channel] || 0) + getNumericField(row, colMap, 'cost');
    }
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sheetData?.general, filters]);

  // Impressions by Province — Issue #15: narrow deps
  const impsByProvince = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const agg = {};
    for (const row of filtered) {
      const prov = row._parsed?.province || 'Unknown';
      agg[prov] = (agg[prov] || 0) + getNumericField(row, colMap, 'impressions');
    }
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sheetData?.general, filters]);

  // Issue #11: Daily trend — aggregate from General sheet (which has impressions)
  // The dailyConversions sheet has conversions, not impressions.
  const dailyTrend = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const dateCol = colMap.date;
    const impsCol = colMap.impressions;
    if (!dateCol || !impsCol) return [];

    const agg = {};
    for (const row of filtered) {
      const d = parseDate(row[dateCol]);
      if (!d) continue;
      const key = d.toISOString().split('T')[0];
      const imps = typeof row[impsCol] === 'number' ? row[impsCol] : 0;
      agg[key] = (agg[key] || 0) + imps;
    }

    return Object.entries(agg)
      .map(([date, impressions]) => ({ date, impressions }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sheetData?.general, filters]);

  if (totalImpressions === 0) {
    return <EmptyState message="No data available for the selected filters" />;
  }

  return (
    <div className="space-y-12 animate-in fade-in">
      {/* KPI Cards — two rows of 4 */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ gap: '24px' }}
      >
        <KPICard label="Total Spend" value={formatCurrency(totalSpend)} icon={DollarSign} color="#1A3A6B" />
        <KPICard label="Impressions" value={formatNumber(totalImpressions)} icon={Eye} color="#2E7D32" />
        <KPICard label="Video Completions" value={formatNumber(totalVideoCompletions)} icon={PlayCircle} color="#1565C0" />
        <KPICard label="VCR" value={formatPercent(overallVCR)} icon={TrendingUp} color="#6A1B9A" />
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ gap: '24px' }}
      >
        <KPICard label="Conversions" value={formatNumber(totalConversions)} icon={Target} color="#D32F2F" />
        <KPICard label="CPM" value={formatCurrency(cpm)} icon={Monitor} color="#E65100" />
        <KPICard label="CPCV" value={formatCurrency(cpcv)} icon={DollarSign} color="#00695C" />
        <KPICard label="Cost Per Conversion" value={formatCurrency(costPerConversion)} icon={Target} color="#F57C00" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        <DonutChart
          data={spendByChannel}
          title="Spend by Channel Type"
          formatter={formatCurrency}
          branding={branding}
        />
        <BarChartComponent
          data={impsByProvince}
          bars={[{ key: 'value', label: 'Impressions' }]}
          xKey="name"
          title="Impressions by Province"
          layout="horizontal"
          branding={branding}
          colorPerBar
        />
      </div>

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <TrendChart
          data={dailyTrend}
          lines={[{ key: 'impressions', label: 'Daily Impressions' }]}
          xKey="date"
          title="Daily Impressions Trend"
          branding={branding}
        />
      )}
    </div>
  );
}
