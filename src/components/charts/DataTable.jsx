import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({ data, columns, title, maxRows = 50, defaultSort }) {
  const [sortConfig, setSortConfig] = useState(
    defaultSort || { key: null, direction: 'desc' }
  );

  const sortedData = useMemo(() => {
    if (!data?.length) return [];
    if (!sortConfig.key) return data.slice(0, maxRows);

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted.slice(0, maxRows);
  }, [data, sortConfig, maxRows]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  if (!data?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
      {title && (
        <div className="px-10 py-6 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text)] tracking-wide">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-8 py-5 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap ${
                    col.sortable !== false ? 'cursor-pointer hover:text-[var(--color-text)] select-none' : ''
                  } ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {sortConfig.key === col.key && (
                      sortConfig.direction === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg)] transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg)]/50'
                }`}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-8 py-5 text-[var(--color-text)] text-[13px] whitespace-nowrap ${
                      col.align === 'right' ? 'text-right tabular-nums' : ''
                    } ${col.truncate ? 'max-w-[320px] truncate' : ''}`}
                    title={col.truncate ? String(row[col.key] ?? '') : undefined}
                  >
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > maxRows && (
        <div className="px-10 py-5 text-sm text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
}
