import { useMemo } from 'react';
import KPICard from '../charts/KPICard';
import BarChartComponent from '../charts/BarChart';
import TrendChart from '../charts/TrendChart';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatDecimal } from '../../utils/formatters';
import { getNumericField } from '../../utils/csvParser';
import { parseDate } from '../../utils/dataTransformers';
import { Tv, Users, Repeat } from 'lucide-react';

export default function LinearTV({ sheetData, filters, branding }) {
  // LTV Insights KPIs — Issue #15: narrow deps
  const ltvInsights = sheetData?.ltvInsights;
  const kpis = useMemo(() => {
    const ltv = ltvInsights;
    if (!ltv?.data?.length) return null;
    const colMap = ltv.colMap;

    // Find the row with largest reach (cumulative total)
    let bestRow = ltv.data[0];
    for (const row of ltv.data) {
      const reach = getNumericField(row, colMap, 'reach');
      const bestReach = getNumericField(bestRow, colMap, 'reach');
      if (reach > bestReach) bestRow = row;
    }

    return {
      tvImpressions: getNumericField(bestRow, colMap, 'tvImpressions'),
      reach: getNumericField(bestRow, colMap, 'reach'),
      frequency: getNumericField(bestRow, colMap, 'frequency'),
    };
  }, [ltvInsights]);

  // Top Stations — Issue #15: narrow deps
  const topStations = sheetData?.topStations;
  const stationsData = useMemo(() => {
    const ts = topStations;
    if (!ts?.data?.length) return [];
    const colMap = ts.colMap;
    const stationCol = colMap.topStations;
    const impsCol = colMap.tvImpressions || colMap.impressions;
    if (!stationCol) return [];

    return ts.data
      .map(row => ({
        name: row[stationCol] || 'Unknown',
        impressions: impsCol ? (typeof row[impsCol] === 'number' ? row[impsCol] : 0) : 0,
      }))
      .filter(r => r.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);
  }, [topStations]);

  // Daily LTV trend — Issue #15: narrow deps
  const ltvByDay = sheetData?.ltvByDay;
  const dailyTrend = useMemo(() => {
    const ltvDay = ltvByDay;
    if (!ltvDay?.data?.length) return [];
    const colMap = ltvDay.colMap;
    const dateCol = colMap.date;
    const impsCol = colMap.ltvImpressions || colMap.impressions;
    const reachCol = colMap.reach;
    if (!dateCol) return [];

    return ltvDay.data
      .map(row => {
        const d = parseDate(row[dateCol]);
        return {
          date: d ? d.toISOString().split('T')[0] : String(row[dateCol]),
          impressions: impsCol ? (typeof row[impsCol] === 'number' ? row[impsCol] : 0) : 0,
          reach: reachCol ? (typeof row[reachCol] === 'number' ? row[reachCol] : 0) : 0,
        };
      })
      .filter(r => r.impressions > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [ltvByDay]);

  const hasData = kpis || stationsData.length > 0 || dailyTrend.length > 0;
  if (!hasData) return <EmptyState message="No Linear TV data available" />;

  return (
    <div className="space-y-12">
      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px' }}>
          <KPICard label="LTV Impressions" value={formatNumber(kpis.tvImpressions)} icon={Tv} />
          <KPICard label="Reach" value={formatNumber(kpis.reach)} icon={Users} />
          <KPICard label="Frequency" value={formatDecimal(kpis.frequency, 1)} icon={Repeat} />
        </div>
      )}

      {/* Top Stations */}
      {stationsData.length > 0 && (
        <BarChartComponent
          data={stationsData}
          bars={[{ key: 'impressions', label: 'TV Impressions' }]}
          xKey="name"
          title="Top Linear TV Stations"
          layout="horizontal"
          height={Math.max(300, stationsData.length * 30)}
          branding={branding}
          colorPerBar
        />
      )}

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <TrendChart
          data={dailyTrend}
          lines={[
            { key: 'impressions', label: 'LTV Impressions' },
            { key: 'reach', label: 'Reach' },
          ]}
          xKey="date"
          title="Daily Linear TV Trend"
          branding={branding}
        />
      )}
    </div>
  );
}
