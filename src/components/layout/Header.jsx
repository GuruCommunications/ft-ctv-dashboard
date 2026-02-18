import { Download, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { formatDateFull } from '../../utils/formatters';

export default function Header({ config, lastUpdated, stale, onRefresh, onExport }) {
  return (
    <header className="bg-white border-b border-[var(--color-border)] px-12 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {config?.logo && (
            <img
              src={config.logo}
              alt={config.clientName}
              className="h-14 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-wide">
              {config?.clientName || 'Campaign Dashboard'}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1.5 tracking-wide">
              {config?.campaignName}
              {config?.dateRange && <span className="mx-3 text-[var(--color-border)]">|</span>}
              {config?.dateRange && <span>{config.dateRange}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {lastUpdated && (
            <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Clock className="w-4 h-4" />
              Last updated: {formatDateFull(lastUpdated)}
              {stale && (
                <span className="flex items-center gap-1 text-amber-600 ml-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cached
                </span>
              )}
            </span>
          )}

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2.5 px-6 py-3 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity tracking-wide shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>
    </header>
  );
}
