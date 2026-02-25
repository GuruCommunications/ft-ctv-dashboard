import { useMemo } from 'react';
import BarChartComponent from '../charts/BarChart';
import DataTable from '../charts/DataTable';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { getNumericField, computeVCR } from '../../utils/csvParser';

function parseCreativeFormat(name) {
  if (!name) return 'Unknown';
  const str = String(name);
  if (/30s/i.test(str)) return 'CTV 30s';
  if (/15s/i.test(str)) return 'OLV 15s';
  if (/300x250/i.test(str)) return 'Display 300x250';
  if (/728x90/i.test(str)) return 'Display 728x90';
  if (/160x600/i.test(str)) return 'Display 160x600';
  if (/320x50/i.test(str)) return 'Mobile 320x50';
  if (/CTV/i.test(str)) return 'CTV';
  if (/OLV/i.test(str)) return 'OLV';
  if (/Display/i.test(str)) return 'Display';
  return 'Other';
}

export default function CreativePerformance({ sheetData, filters, branding }) {
  const creative = sheetData?.creative;

  const tableData = useMemo(() => {
    if (!creative?.data?.length) return [];
    const colMap = creative.colMap;
    const creativeCol = colMap.creative;
    if (!creativeCol) return [];

    return creative.data.map(row => ({
      creative: row[creativeCol] || 'Unknown',
      format: parseCreativeFormat(row[creativeCol]),
      impressions: getNumericField(row, colMap, 'impressions'),
      clicks: getNumericField(row, colMap, 'clicks'),
      conversions: getNumericField(row, colMap, 'conversions'),
      videoCompletions: getNumericField(row, colMap, 'videoCompletions'),
      vcr: computeVCR(row, colMap),
    })).filter(r => r.impressions > 0);
  }, [creative]);

  if (!tableData.length) return <EmptyState message="No creative data available" />;

  const chartData = [...tableData]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(r => ({
      name: r.creative.length > 30 ? r.creative.substring(0, 30) + '...' : r.creative,
      impressions: r.impressions,
      vcr: r.vcr * 100,
    }));

  const columns = [
    { key: 'creative', label: 'Creative', truncate: true },
    { key: 'format', label: 'Format' },
    { key: 'impressions', label: 'Impressions', align: 'right', render: v => formatNumber(v) },
    { key: 'clicks', label: 'Clicks', align: 'right', render: v => formatNumber(v) },
    { key: 'conversions', label: 'Conversions', align: 'right', render: v => formatNumber(v) },
    { key: 'videoCompletions', label: 'Video Comp.', align: 'right', render: v => formatNumber(v) },
    { key: 'vcr', label: 'VCR', align: 'right', render: v => formatPercent(v) },
  ];

  return (
    <div className="space-y-12">
      <BarChartComponent data={chartData} bars={[{ key: 'impressions', label: 'Impressions' }]} xKey="name" title="Impressions by Creative" layout="horizontal" height={Math.max(300, chartData.length * 40)} branding={branding} />
      <DataTable data={tableData} columns={columns} title="Creative Performance Details" defaultSort={{ key: 'impressions', direction: 'desc' }} />
    </div>
  );
}
