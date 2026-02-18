import { useMemo } from 'react';
import BarChartComponent from '../charts/BarChart';
import DataTable from '../charts/DataTable';
import EmptyState from '../ui/EmptyState';
import { formatPercent, formatDecimal } from '../../utils/formatters';

const DEMO_SECTIONS = [
  { key: 'education', label: 'Education' },
  { key: 'income', label: 'Income' },
  { key: 'interests', label: 'Interests' },
  { key: 'prizm', label: 'Prizm Segments' },
  { key: 'sitesOlvDisplay', label: 'Sites OLV / Display' },
];

function DemoSection({ data, label, branding }) {
  if (!data?.data?.length) return null;

  const headers = data.headers || [];
  // Find the category column (first column)
  const categoryCol = headers[0];
  const colMap = data.colMap || {};
  const indexCol = colMap.index || headers.find(h => /index/i.test(h));
  const audShareCol = colMap.audienceShare || headers.find(h => /audience.*share/i.test(h));
  const popShareCol = colMap.populationShare || headers.find(h => /population.*share/i.test(h));

  if (!categoryCol) return null;

  const tableData = data.data.map(row => ({
    category: row[categoryCol] || 'Unknown',
    audienceShare: audShareCol ? (typeof row[audShareCol] === 'number' ? row[audShareCol] : 0) : 0,
    populationShare: popShareCol ? (typeof row[popShareCol] === 'number' ? row[popShareCol] : 0) : 0,
    index: indexCol ? (typeof row[indexCol] === 'number' ? row[indexCol] : 0) : 0,
  })).filter(r => r.category !== 'Unknown');

  if (!tableData.length) return null;

  const chartData = tableData
    .sort((a, b) => b.index - a.index)
    .slice(0, 15)
    .map(r => ({
      name: r.category.length > 30 ? r.category.substring(0, 30) + '...' : r.category,
      index: r.index,
    }));

  const columns = [
    { key: 'category', label: 'Category', truncate: true },
    { key: 'audienceShare', label: 'Audience Share', align: 'right', render: v => formatPercent(v) },
    { key: 'populationShare', label: 'Population Share', align: 'right', render: v => formatPercent(v) },
    { key: 'index', label: 'Index', align: 'right', render: v => (
      <span className={v > 100 ? 'text-green-600 font-semibold' : v < 100 ? 'text-red-500' : ''}>
        {formatDecimal(v, 0)}
      </span>
    )},
  ];

  return (
    <div className="space-y-8">
      <h3 className="text-base font-semibold text-[var(--color-text)]">{label}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px' }}>
        <BarChartComponent
          data={chartData}
          bars={[{ key: 'index', label: 'Index' }]}
          xKey="name"
          title={`${label} — Index vs Population`}
          layout="horizontal"
          height={Math.max(250, chartData.length * 28)}
          branding={branding}
          colorPerBar
        />
        <DataTable
          data={tableData}
          columns={columns}
          defaultSort={{ key: 'index', direction: 'desc' }}
        />
      </div>
    </div>
  );
}

export default function Demographics({ sheetData, filters, branding }) {
  const hasDemoData = useMemo(() => {
    return DEMO_SECTIONS.some(sec => sheetData?.[sec.key]?.data?.length > 0);
  }, [sheetData]);

  if (!hasDemoData) return null; // Hide entire section when no data

  return (
    <div className="space-y-12">
      {DEMO_SECTIONS.map(sec => (
        <DemoSection
          key={sec.key}
          data={sheetData?.[sec.key]}
          label={sec.label}
          branding={branding}
        />
      ))}
    </div>
  );
}
