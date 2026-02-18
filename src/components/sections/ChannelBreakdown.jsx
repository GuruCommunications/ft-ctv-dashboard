import { useMemo } from 'react';
import BarChartComponent from '../charts/BarChart';
import DonutChart from '../charts/DonutChart';
import DataTable from '../charts/DataTable';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { getNumericField } from '../../utils/csvParser';

export default function ChannelBreakdown({ sheetData, filters, branding }) {
  const channel = sheetData?.channel;

  const tableData = useMemo(() => {
    if (!channel?.data?.length) return [];
    const colMap = channel.colMap;
    const supplierCol = colMap.ctvSupplier;
    if (!supplierCol) return [];

    return channel.data.map(row => ({
      supplier: row[supplierCol] || 'Unknown',
      impressions: getNumericField(row, colMap, 'impressions'),
      clicks: getNumericField(row, colMap, 'clicks'),
      conversions: getNumericField(row, colMap, 'conversions'),
      videoStarts: getNumericField(row, colMap, 'videoStarts'),
      videoCompletions: getNumericField(row, colMap, 'videoCompletions'),
      vcr: (() => {
        const vcrVal = getNumericField(row, colMap, 'vcr');
        if (vcrVal > 0) return vcrVal;
        const starts = getNumericField(row, colMap, 'videoStarts');
        const comps = getNumericField(row, colMap, 'videoCompletions');
        return starts > 0 ? comps / starts : 0;
      })(),
    })).filter(r => r.impressions > 0);
  }, [channel]);

  if (!tableData.length) return <EmptyState message="No channel data available" />;

  const chartData = tableData
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  const donutData = chartData.map(r => ({ name: r.supplier, value: r.impressions }));

  const columns = [
    { key: 'supplier', label: 'CTV Supplier' },
    { key: 'impressions', label: 'Impressions', align: 'right', render: v => formatNumber(v) },
    { key: 'clicks', label: 'Clicks', align: 'right', render: v => formatNumber(v) },
    { key: 'conversions', label: 'Conversions', align: 'right', render: v => formatNumber(v) },
    { key: 'videoStarts', label: 'Video Starts', align: 'right', render: v => formatNumber(v) },
    { key: 'videoCompletions', label: 'Video Comp.', align: 'right', render: v => formatNumber(v) },
    { key: 'vcr', label: 'VCR', align: 'right', render: v => formatPercent(v) },
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        <BarChartComponent
          data={chartData}
          bars={[{ key: 'impressions', label: 'Impressions' }]}
          xKey="supplier"
          title="CTV Supplier by Impressions"
          layout="horizontal"
          height={Math.max(300, chartData.length * 35)}
          branding={branding}
          colorPerBar
        />
        <DonutChart
          data={donutData}
          title="Impression Share by Supplier"
          branding={branding}
        />
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        title="Channel Performance Details"
        defaultSort={{ key: 'impressions', direction: 'desc' }}
      />
    </div>
  );
}
