import { Filter, X } from 'lucide-react';

function CheckboxGroup({ label, options, selected, onChange }) {
  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}:
      </span>
      <div className="flex gap-2">
        {options.map(option => (
          <label
            key={option}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm cursor-pointer transition-all border ${
              selected.includes(option)
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggleOption(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FilterBar({
  filters,
  config,
  onProvinceChange,
  onChannelTypeChange,
  onDateRangeChange,
  onClear,
  hasActiveFilters,
  showDateFilter = false,
  dateBounds = null,
}) {
  const provinces = config?.provinces || ['AB', 'BC', 'ON', 'SK&MB&YUK'];
  const channelTypes = config?.channelTypes || ['CTV', 'OLV', 'Display', 'Retargeting'];

  return (
    <div className="bg-white border-b border-[var(--color-border)] px-12 py-6">
      <div className="flex items-center gap-10 flex-wrap">
        <div className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
        </div>

        <CheckboxGroup
          label="Province"
          options={provinces}
          selected={filters.provinces}
          onChange={onProvinceChange}
        />

        <div className="w-px h-8 bg-[var(--color-border)]" />

        <CheckboxGroup
          label="Channel"
          options={channelTypes}
          selected={filters.channelTypes}
          onChange={onChannelTypeChange}
        />

        {showDateFilter && (
          <>
            <div className="w-px h-8 bg-[var(--color-border)]" />

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Date:
              </span>
              <input
                type="date"
                value={filters.dateRange[0] || ''}
                min={dateBounds?.min}
                max={dateBounds?.max}
                onChange={(e) => onDateRangeChange([e.target.value || null, filters.dateRange[1]])}
                className="bg-white border border-[var(--color-border)] text-[var(--color-text)] text-sm rounded-lg px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none"
              />
              <span className="text-sm text-[var(--color-text-muted)]">to</span>
              <input
                type="date"
                value={filters.dateRange[1] || ''}
                min={dateBounds?.min}
                max={dateBounds?.max}
                onChange={(e) => onDateRangeChange([filters.dateRange[0], e.target.value || null])}
                className="bg-white border border-[var(--color-border)] text-[var(--color-text)] text-sm rounded-lg px-4 py-2 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </>
        )}

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
