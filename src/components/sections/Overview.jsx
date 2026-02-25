import { useMemo } from 'react';
import { DollarSign, Eye, PlayCircle, Target, TrendingUp, Monitor } from 'lucide-react';
import KPICard from '../charts/KPICard';
import DonutChart from '../charts/DonutChart';
import BarChartComponent from '../charts/BarChart';
import TrendChart from '../charts/TrendChart';
import EmptyState from '../ui/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { aggregateByDimension } from '../../utils/csvParser';
import { filterData } from '../../hooks/useFilters';
import { parseDate } from '../../utils/dataTransformers';

export default function Overview({ metrics, sheetData, filters, branding }) {
  const { totalSpend, totalImpressions, totalVideoCompletions, overallVCR, totalConversions, costPerConversion, cpm, cpcv } = metrics;

  // Single filter pass for all general-data aggregations
  const { spendByChannel, impsByProvince, dailyTrend } = useMemo(() => {
    const general = sheetData?.general;
    if (!general?.data?.length) return { spendByChannel: [], impsByProvince: [], dailyTrend: [] };
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);

    const spendByChannel = aggregateByDimension(
      filtered, colMap, row => row._parsed?.channelType || 'Unknown', 'cost'
    );

    const impsByProvince = aggregateByDimension(
      filtered, colMap, row => row._parsed?.province || 'Unknown', 'impressions'
    ).sort((a, b) => b.value - a.value);

    // Daily trend
    const dateCol = colMap.date;
    const impsCol = colMap.impressions;
    let dailyTrend = [];
    if (dateCol && impsCol) {
      const agg = {};
      for (const row of filtered) {
        const d = parseDate(row[dateCol]);
        if (!d) continue;
        const key = d.toISOString().split('T')[0];
        const imps = typeof row[impsCol] === 'number' ? row[impsCol] : 0;
        agg[key] = (agg[key] || 0) + imps;
      }
      dailyTrend = Object.entries(agg)
        .map(([date, impressions]) => ({ date, impressions }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return { spendByChannel, impsByProvince, dailyTrend };
  }, [sheetData?.general, filters]);

  if (totalImpressions === 0) {
    return <EmptyState message="No data available for the selected filters" />;
  }

  return (
    <div className="space-y-12 animate-in fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px' }}>
        <KPICard label="Total Spend" value={formatCurrency(totalSpend)} icon={DollarSign} color="#1A3A6B" />
        <KPICard label="Impressions" value={formatNumber(totalImpressions)} icon={Eye} color="#2E7D32" />
        <KPICard label="Video Completions" value={formatNumber(totalVideoCompletions)} icon={PlayCircle} color="#1565C0" />
        <KPICard label="VCR" value={formatPercent(overallVCR)} icon={TrendingUp} color="#6A1B9A" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px' }}>
        <KPICard label="Conversions" value={formatNumber(totalConversions)} icon={Target} color="#D32F2F" />
        <KPICard label="CPM" value={formatCurrency(cpm)} icon={Monitor} color="#E65100" />
        <KPICard label="CPCV" value={formatCurrency(cpcv)} icon={DollarSign} color="#00695C" />
        <KPICard label="Cost Per Conversion" value={formatCurrency(costPerConversion)} icon={Target} color="#F57C00" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        <DonutChart data={spendByChannel} title="Spend by Channel Type" formatter={formatCurrency} branding={branding} />
        <BarChartComponent data={impsByProvince} bars={[{ key: 'value', label: 'Impressions' }]} xKey="name" title="Impressions by Province" layout="horizontal" branding={branding} colorPerBar />
      </div>

      {dailyTrend.length > 0 && (
        <TrendChart data={dailyTrend} lines={[{ key: 'impressions', label: 'Daily Impressions' }]} xKey="date" title="Daily Impressions Trend" branding={branding} />
      )}
    </div>
  );
}
