import { useMemo } from 'react';
import KPICard from '../charts/KPICard';
import BarChartComponent from '../charts/BarChart';
import DataTable from '../charts/DataTable';
import EmptyState from '../ui/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { getNumericField } from '../../utils/csvParser';
import { getProvinceLabel } from '../../utils/dataTransformers';
import { filterData } from '../../hooks/useFilters';
import { MapPin } from 'lucide-react';

export default function GeographicView({ sheetData, filters, branding }) {
  const general = sheetData?.general;

  const provinceData = useMemo(() => {
    if (!general?.data?.length) return [];
    const colMap = general.colMap;
    const filtered = filterData(general.data, filters, colMap);

    const agg = {};
    for (const row of filtered) {
      const prov = row._parsed?.province || 'Unknown';
      if (!agg[prov]) {
        agg[prov] = { province: prov, label: getProvinceLabel(prov), impressions: 0, spend: 0, conversions: 0, videoStarts: 0, videoCompletions: 0 };
      }
      agg[prov].impressions += getNumericField(row, colMap, 'impressions');
      agg[prov].spend += getNumericField(row, colMap, 'cost');
      agg[prov].conversions += getNumericField(row, colMap, 'conversions');
      agg[prov].videoStarts += getNumericField(row, colMap, 'videoStarts');
      agg[prov].videoCompletions += getNumericField(row, colMap, 'videoCompletions');
    }

    return Object.values(agg)
      .map(p => ({
        ...p,
        vcr: p.videoStarts > 0 ? p.videoCompletions / p.videoStarts : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }, [general, filters]);

  if (!provinceData.length) return <EmptyState message="No geographic data available" />;

  const chartData = provinceData.map(p => ({
    name: p.label,
    impressions: p.impressions,
    spend: p.spend,
    conversions: p.conversions,
  }));

  const columns = [
    { key: 'label', label: 'Province' },
    { key: 'impressions', label: 'Impressions', align: 'right', render: v => formatNumber(v) },
    { key: 'spend', label: 'Spend', align: 'right', render: v => formatCurrency(v) },
    { key: 'conversions', label: 'Conversions', align: 'right', render: v => formatNumber(v) },
    { key: 'videoCompletions', label: 'Video Comp.', align: 'right', render: v => formatNumber(v) },
    { key: 'vcr', label: 'VCR', align: 'right', render: v => formatPercent(v) },
  ];

  return (
    <div className="space-y-12">
      {/* Province cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px' }}>
        {provinceData.filter(p => p.province !== 'Unknown').map((prov, i) => (
          <div key={prov.province} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 space-y-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text)]">{prov.label}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Impressions</p>
                <p className="text-sm font-bold text-[var(--color-text)] font-mono">{formatNumber(prov.impressions)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Spend</p>
                <p className="text-sm font-bold text-[var(--color-text)] font-mono">{formatCurrency(prov.spend)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Conversions</p>
                <p className="text-sm font-bold text-[var(--color-text)] font-mono">{formatNumber(prov.conversions)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">VCR</p>
                <p className="text-sm font-bold text-[var(--color-text)] font-mono">{formatPercent(prov.vcr)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <BarChartComponent
        data={chartData}
        bars={[
          { key: 'impressions', label: 'Impressions' },
          { key: 'conversions', label: 'Conversions' },
        ]}
        xKey="name"
        title="Province Comparison"
        branding={branding}
      />

      {/* Full table */}
      <DataTable
        data={provinceData}
        columns={columns}
        title="Province-Level Summary"
        defaultSort={{ key: 'impressions', direction: 'desc' }}
      />
    </div>
  );
}
