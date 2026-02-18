import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getChartColors } from '../../utils/theme';
import { formatCompact } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg px-4 py-3 shadow-lg">
      <p className="text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : formatCompact(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function TrendChart({ data, lines, xKey = 'date', height = 350, title, formatter, branding }) {
  const colors = getChartColors(branding);

  if (!data?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-10 shadow-sm">
      {title && <h3 className="text-base font-semibold text-[var(--color-text)] mb-8 tracking-wide">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            tickFormatter={formatCompact}
            tickLine={false}
            axisLine={false}
            width={65}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          {lines.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
          )}
          {lines.map((line, i) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label || line.key}
              stroke={colors[i % colors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: colors[i % colors.length], strokeWidth: 2, fill: 'white' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
