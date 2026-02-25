import { useMemo } from 'react';
import BarChartComponent from '../charts/BarChart';
import DataTable from '../charts/DataTable';
import KPICard from '../charts/KPICard';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { getNumericField, computeVCR } from '../../utils/csvParser';
import { Trophy } from 'lucide-react';

export default function AudienceInsights({ sheetData, filters, branding }) {
  const audiences = sheetData?.audiences;

  const tableData = useMemo(() => {
    if (!audiences?.data?.length) return [];
    const colMap = audiences.colMap;
    const segmentCol = colMap.segment;
    if (!segmentCol) return [];

    return audiences.data.map(row => ({
      segment: row[segmentCol] || 'Unknown',
      impressions: getNumericField(row, colMap, 'impressions'),
      clicks: getNumericField(row, colMap, 'clicks'),
      conversions: getNumericField(row, colMap, 'conversions'),
      videoCompletions: getNumericField(row, colMap, 'videoCompletions'),
      vcr: computeVCR(row, colMap),
    })).filter(r => r.impressions > 0);
  }, [audiences]);

  if (!tableData.length) return <EmptyState message="No audience data available" />;

  const top3 = [...tableData].sort((a, b) => b.conversions - a.conversions).slice(0, 3);
  const chartData = [...tableData].sort((a, b) => b.impressions - a.impressions).slice(0, 15);

  const columns = [
    { key: 'segment', label: 'Segment', truncate: true },
    { key: 'impressions', label: 'Impressions', align: 'right', render: v => formatNumber(v) },
    { key: 'clicks', label: 'Clicks', align: 'right', render: v => formatNumber(v) },
    { key: 'conversions', label: 'Conversions', align: 'right', render: v => formatNumber(v) },
    { key: 'videoCompletions', label: 'Video Comp.', align: 'right', render: v => formatNumber(v) },
    { key: 'vcr', label: 'VCR', align: 'right', render: v => formatPercent(v) },
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px' }}>
        {top3.map((seg, i) => (
          <KPICard key={seg.segment} label={`#${i + 1} by Conversions`} value={seg.segment} subtitle={`${formatNumber(seg.conversions)} conversions | ${formatPercent(seg.vcr)} VCR`} icon={Trophy} />
        ))}
      </div>
      <BarChartComponent data={chartData} bars={[{ key: 'impressions', label: 'Impressions' }]} xKey="segment" title="Impressions by Audience Segment" layout="horizontal" height={Math.max(300, chartData.length * 35)} branding={branding} colorPerBar />
      <DataTable data={tableData} columns={columns} title="Audience Segment Performance" defaultSort={{ key: 'impressions', direction: 'desc' }} />
    </div>
  );
}
