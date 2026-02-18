export default function KPICard({ label, value, subtitle, icon: Icon, color }) {
  const accentColor = color || 'var(--color-primary)';
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-1.5" style={{ backgroundColor: accentColor }} />
      <div className="px-8 py-7 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            {label}
          </span>
          {Icon && <Icon className="w-5 h-5 text-[var(--color-text-muted)]" style={{ opacity: 0.5 }} />}
        </div>
        <span className="text-3xl font-bold text-[var(--color-text)] tracking-tight leading-tight">
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-[var(--color-text-muted)] leading-relaxed">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
