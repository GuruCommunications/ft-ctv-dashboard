import { useMemo } from 'react';
import DataTable from '../charts/DataTable';
import BarChartComponent from '../charts/BarChart';
import EmptyState from '../ui/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { getNumericField, computeVCR } from '../../utils/csvParser';
import { filterData } from '../../hooks/useFilters';

export default function Performance({ sheetData, filters, branding }) {
  const general = sheetData?.general;

  const { tableData, targetingData } = useMemo(() => {
    if (!general?.data?.length) return { tableData: [], targetingData: [] };
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);
    const liNameCol = colMap.liName;

    const table = filtered.map(row => ({
      liName: liNameCol ? row[liNameCol] : 'Unknown',
      channelType: row._parsed?.channelType || '',
      targeting: row._parsed?.targeting || '',
      province: row._parsed?.province || '',
      cost: getNumericField(row, colMap, 'cost'),
      impressions: getNumericField(row, colMap, 'impressions'),
      conversions: getNumericField(row, colMap, 'conversions'),
      videoCompletions: getNumericField(row, colMap, 'videoCompletions'),
      videoStarts: getNumericField(row, colMap, 'videoStarts'),
      vcr: computeVCR(row, colMap),
    }));

    const targAgg = {};
    for (const row of table) {
      const key = row.targeting || 'Other';
      if (!targAgg[key]) targAgg[key] = { name: key, impressions: 0 };
      targAgg[key].impressions += row.impressions;
    }
    const targeting = Object.values(targAgg)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);

    return { tableData: table, targetingData: targeting };
  }, [general, filters]);

  if (!tableData.length) return <EmptyState message="No performance data available" />;

  const columns = [
    { key: 'liName', label: 'Line Item', truncate: true },
    { key: 'channelType', label: 'Channel' },
    { key: 'targeting', label: 'Targeting', truncate: true },
    { key: 'province', label: 'Province' },
    { key: 'cost', label: 'Cost', align: 'right', render: v => formatCurrency(v) },
    { key: 'impressions', label: 'Impressions', align: 'right', render: v => formatNumber(v) },
    { key: 'conversions', label: 'Conversions', align: 'right', render: v => formatNumber(v) },
    { key: 'videoCompletions', label: 'Video Comp.', align: 'right', render: v => formatNumber(v) },
    { key: 'vcr', label: 'VCR', align: 'right', render: v => formatPercent(v) },
  ];

  return (
    <div className="space-y-12">
      {targetingData.length > 0 && (
        <BarChartComponent data={targetingData} bars={[{ key: 'impressions', label: 'Impressions' }]} xKey="name" title="Impressions by Targeting Strategy" layout="horizontal" height={Math.max(300, targetingData.length * 35)} branding={branding} colorPerBar />
      )}
      <DataTable data={tableData} columns={columns} title="Line Item Performance" maxRows={100} defaultSort={{ key: 'impressions', direction: 'desc' }} />
    </div>
  );
}
