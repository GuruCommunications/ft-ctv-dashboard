import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getChartColors } from '../../utils/theme';
import { formatCompact, formatPercent } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, formatter }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold" style={{ color: entry.payload.fill }}>
        {entry.name}: {formatter ? formatter(entry.value) : formatCompact(entry.value)}
      </p>
      {entry.percent != null && (
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {formatPercent(entry.percent)}
        </p>
      )}
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DonutChart({ data, dataKey = 'value', nameKey = 'name', height = 350, title, formatter, branding }) {
  const colors = getChartColors(branding);

  if (!data?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-10 shadow-sm">
      {title && <h3 className="text-base font-semibold text-[var(--color-text)] mb-8 tracking-wide">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 13, color: 'var(--color-text-muted)', paddingLeft: 20 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
