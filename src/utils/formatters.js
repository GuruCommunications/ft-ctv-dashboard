export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-CA').format(Math.round(value));
}

export function formatDecimal(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0.00';
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Issue #8: Explicit ratio mode flag instead of fragile heuristic
// If asRatio=true (default), values like 0.95 become 95.0%.
// If asRatio=false, value is already a percentage (e.g., 95 → 95.0%)
export function formatPercent(value, asRatio = true) {
  if (value == null || isNaN(value)) return '0%';
  const pct = asRatio && value >= 0 && value <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

export function formatCompact(value) {
  if (value == null || isNaN(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value);
}

export function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// Issue #31: Include time in "Last updated" display
export function formatDateFull(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}
