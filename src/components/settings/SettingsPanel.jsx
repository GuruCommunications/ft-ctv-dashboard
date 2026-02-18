import { useState } from 'react';
import { Check, X, Copy, TestTube } from 'lucide-react';

const SHEET_LABELS = {
  general: 'General (Line Items)',
  audiences: 'Audiences',
  creative: 'Creative',
  channel: 'Channel (CTV Suppliers)',
  conversionTypes: 'Conversion Types',
  dailyConversions: 'Daily Conversions',
  ltvInsights: 'LTV Insights',
  topStations: 'Top Stations',
  ltvByDay: 'LTV Impressions by Day',
  education: 'Education',
  income: 'Income',
  interests: 'Interests',
  prizm: 'Prizm',
  sitesOlvDisplay: 'Sites OLV / Display',
};

const BRANDING_FIELDS = [
  { key: 'primaryColor', label: 'Primary Color' },
  { key: 'secondaryColor', label: 'Secondary Color' },
  { key: 'accentColor', label: 'Accent Color' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'surfaceColor', label: 'Surface/Cards' },
  { key: 'textColor', label: 'Text Color' },
  { key: 'textMuted', label: 'Muted Text' },
  { key: 'borderColor', label: 'Border Color' },
];

function safeParseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

export default function SettingsPanel({ config, onConfigChange }) {
  // Issue #2: Safe JSON.parse, Issue #24: Remove redundant useEffect
  const [localConfig, setLocalConfig] = useState(() => {
    return safeParseJSON(localStorage.getItem('dashboard_config'), config);
  });
  const [testResults, setTestResults] = useState({});
  const [copied, setCopied] = useState(false);

  const updateField = (path, value) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = () => {
    localStorage.setItem('dashboard_config', JSON.stringify(localConfig));
    onConfigChange(localConfig);
  };

  // Issue #30: Parallel connection testing for speed
  const testConnections = async () => {
    const sources = localConfig.dataSources || {};
    const entries = Object.entries(sources);
    const results = {};

    // Mark skips first
    for (const [key, url] of entries) {
      if (!url) results[key] = { status: 'skip', message: 'No URL' };
    }
    setTestResults({ ...results });

    // Test all URLs in parallel
    const testable = entries.filter(([, url]) => url);
    const settled = await Promise.allSettled(
      testable.map(async ([key, url]) => {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          const lines = text.split('\n').filter(l => l.trim());
          return { key, status: 'ok', message: `${lines.length - 1} rows` };
        }
        return { key, status: 'error', message: `HTTP ${res.status}` };
      })
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const { key, status, message } = outcome.value;
        results[key] = { status, message };
      } else {
        // Find which key failed
        const idx = settled.indexOf(outcome);
        results[testable[idx][0]] = { status: 'error', message: outcome.reason?.message || 'Failed' };
      }
    }
    setTestResults({ ...results });
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(localConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Campaign Metadata */}
      <section className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 space-y-5 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Campaign Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'clientName', label: 'Client Name' },
            { key: 'campaignName', label: 'Campaign Name' },
            { key: 'dateRange', label: 'Date Range' },
            { key: 'logo', label: 'Logo URL' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{field.label}</label>
              <input
                type="text"
                value={localConfig[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <section className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Google Sheets CSV URLs</h2>
          <button
            onClick={testConnections}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <TestTube className="w-3 h-3" />
            Test All Connections
          </button>
        </div>
        <div className="space-y-3">
          {Object.entries(SHEET_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-44 text-xs font-medium text-[var(--color-text-muted)] shrink-0">{label}</label>
              <input
                type="text"
                value={localConfig.dataSources?.[key] || ''}
                onChange={e => updateField(`dataSources.${key}`, e.target.value)}
                placeholder="Paste Google Sheets CSV URL..."
                className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
              />
              {testResults[key] && (
                <span className={`text-xs shrink-0 flex items-center gap-1 ${
                  testResults[key].status === 'ok' ? 'text-green-600' : testResults[key].status === 'error' ? 'text-red-500' : 'text-[var(--color-text-muted)]'
                }`}>
                  {testResults[key].status === 'ok' ? <Check className="w-3 h-3" /> : testResults[key].status === 'error' ? <X className="w-3 h-3" /> : null}
                  {testResults[key].message}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Branding */}
      <section className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 space-y-5 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Branding Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BRANDING_FIELDS.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{field.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localConfig.branding?.[field.key] || '#000000'}
                  onChange={e => updateField(`branding.${field.key}`, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={localConfig.branding?.[field.key] || ''}
                  onChange={e => updateField(`branding.${field.key}`, e.target.value)}
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded-lg px-2 py-1.5 font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          Save Configuration
        </button>
        <button
          onClick={copyConfig}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Config JSON'}
        </button>
      </div>
    </div>
  );
}
