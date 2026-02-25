import { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
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

export default memo(function BarChartComponent({
  data,
  bars,
  xKey = 'name',
  height = 350,
  title,
  layout = 'vertical',
  formatter,
  branding,
  colorPerBar = false,
}) {
  const colors = getChartColors(branding);

  if (!data?.length) return null;

  const isHorizontal = layout === 'horizontal';

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-10 shadow-sm">
      {title && <h3 className="text-base font-semibold text-[var(--color-text)] mb-8 tracking-wide">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: isHorizontal ? 130 : 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={formatCompact}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                tickFormatter={formatCompact}
                tickLine={false}
                axisLine={false}
                width={65}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />}
          {bars.map((bar, i) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.label || bar.key}
              fill={colors[i % colors.length]}
              radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={40}
            >
              {colorPerBar &&
                data.map((_, idx) => (
                  <Cell key={idx} fill={colors[idx % colors.length]} />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});
