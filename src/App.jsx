import { useState, useEffect, useMemo, useCallback, useRef, Component } from 'react';
import DashboardShell from './components/layout/DashboardShell';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import FilterBar from './components/layout/FilterBar';
import Overview from './components/sections/Overview';
import Performance from './components/sections/Performance';
import ChannelBreakdown from './components/sections/ChannelBreakdown';
import AudienceInsights from './components/sections/AudienceInsights';
import CreativePerformance from './components/sections/CreativePerformance';
import Conversions from './components/sections/Conversions';
import LinearTV from './components/sections/LinearTV';
import Demographics from './components/sections/Demographics';
import GeographicView from './components/sections/GeographicView';
import SettingsPanel from './components/settings/SettingsPanel';
import LoadingState from './components/ui/LoadingState';
import { useSheetData } from './hooks/useSheetData';
import { useFilters } from './hooks/useFilters';
import { useDerivedMetrics } from './hooks/useDerivedMetrics';
import { applyTheme } from './utils/theme';
import { exportToPDF } from './utils/pdfExport';
import { parseDate } from './utils/dataTransformers';

import defaultConfig from './config/clients/fountain-tire.json';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md bg-white rounded-xl p-10 shadow-lg">
            <h1 className="text-xl font-bold text-[var(--color-text)]">Something went wrong</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{this.state.error?.message}</p>
            <button
              onClick={() => { localStorage.removeItem('dashboard_config'); window.location.reload(); }}
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90"
            >
              Reset &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeParseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

// Config version — bump this when the default config changes significantly
// (e.g. branding overhaul). This forces stale cached configs to be replaced.
const CONFIG_VERSION = 6;

function getInitialConfig() {
  const storedVersion = localStorage.getItem('dashboard_config_version');
  if (storedVersion !== String(CONFIG_VERSION)) {
    // Clear ALL stale data — config + CSV caches
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('csv_cache_') || k === 'dashboard_config') {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    localStorage.setItem('dashboard_config_version', String(CONFIG_VERSION));
    return defaultConfig;
  }
  return safeParseJSON(localStorage.getItem('dashboard_config'), defaultConfig);
}

function Dashboard() {
  const [config, setConfig] = useState(getInitialConfig);

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    applyTheme(config?.branding);
  }, [config?.branding]);

  const { data: sheetData, loading, errors, lastUpdated, stale, refresh } = useSheetData(config);

  const {
    filters,
    setProvinces,
    setChannelTypes,
    setDateRange,
    clearFilters,
    hasActiveFilters,
  } = useFilters();

  // Derive the actual date range from dailyConversions data
  const dateBounds = useMemo(() => {
    const daily = sheetData?.dailyConversions;
    if (!daily?.data?.length || !daily.colMap?.date) return null;
    const dateCol = daily.colMap.date;
    let min = null;
    let max = null;
    for (const row of daily.data) {
      const d = parseDate(row[dateCol]);
      if (!d) continue;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    }
    if (!min || !max) return null;
    return {
      min: min.toISOString().split('T')[0],
      max: max.toISOString().split('T')[0],
    };
  }, [sheetData?.dailyConversions]);

  // Auto-populate date range when entering Conversions tab;
  // clear it when leaving so it doesn't silently affect other views
  const hasSetDateRef = useRef(false);
  const handleTabChange = useCallback((tab) => {
    setActiveTab(prev => {
      if (prev === 'conversions' && tab !== 'conversions') {
        setDateRange([null, null]);
        hasSetDateRef.current = false;
      }
      return tab;
    });
  }, [setDateRange]);

  // When arriving at Conversions tab with no date set, populate from data bounds
  useEffect(() => {
    if (activeTab === 'conversions' && dateBounds && !hasSetDateRef.current) {
      if (!filters.dateRange[0] && !filters.dateRange[1]) {
        setDateRange([dateBounds.min, dateBounds.max]);
        hasSetDateRef.current = true;
      }
    }
  }, [activeTab, dateBounds, filters.dateRange, setDateRange]);

  const metrics = useDerivedMetrics(sheetData, filters);

  const availableTabs = useMemo(() => {
    const tabs = ['overview'];
    if (sheetData?.general?.data?.length) {
      tabs.push('performance', 'geographic');
    }
    if (sheetData?.channel?.data?.length) tabs.push('channel');
    if (sheetData?.audiences?.data?.length) tabs.push('audiences');
    if (sheetData?.creative?.data?.length) tabs.push('creative');
    if (sheetData?.dailyConversions?.data?.length || sheetData?.conversionTypes?.data?.length) tabs.push('conversions');
    if (sheetData?.ltvInsights?.data?.length || sheetData?.topStations?.data?.length || sheetData?.ltvByDay?.data?.length) tabs.push('linearTV');

    const demoKeys = ['education', 'income', 'interests', 'prizm', 'sitesOlvDisplay'];
    if (demoKeys.some(k => sheetData?.[k]?.data?.length > 0)) tabs.push('demographics');

    tabs.push('settings');
    return [...new Set(tabs)];
  }, [sheetData]);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
    refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    exportToPDF(config, sheetData, filters);
  }, [config, sheetData, filters]);

  const errorCount = Object.keys(errors).length;

  const renderSection = () => {
    if (activeTab === 'settings') {
      return <SettingsPanel config={config} onConfigChange={handleConfigChange} />;
    }

    if (loading) {
      return <LoadingState message="Fetching campaign data..." />;
    }

    switch (activeTab) {
      case 'overview':
        return <Overview metrics={metrics} sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'performance':
        return <Performance sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'channel':
        return <ChannelBreakdown sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'audiences':
        return <AudienceInsights sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'creative':
        return <CreativePerformance sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'conversions':
        return <Conversions sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'linearTV':
        return <LinearTV sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'demographics':
        return <Demographics sheetData={sheetData} filters={filters} branding={config?.branding} />;
      case 'geographic':
        return <GeographicView sheetData={sheetData} filters={filters} branding={config?.branding} />;
      default:
        return <Overview metrics={metrics} sheetData={sheetData} filters={filters} branding={config?.branding} />;
    }
  };

  return (
    <DashboardShell>
      <Header
        config={config}
        lastUpdated={lastUpdated}
        stale={stale}
        onRefresh={refresh}
        onExport={handleExport}
      />

      <div className="flex">
        <Navigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          availableTabs={availableTabs}
        />

        <div className="flex-1 min-w-0 overflow-x-hidden">
          {activeTab !== 'settings' && (
            <FilterBar
              filters={filters}
              config={config}
              onProvinceChange={setProvinces}
              onChannelTypeChange={setChannelTypes}
              onDateRangeChange={setDateRange}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
              showDateFilter={activeTab === 'conversions'}
              dateBounds={dateBounds}
            />
          )}

          {stale && (
            <div className="bg-amber-50 border-b border-amber-200 px-10 py-3 text-sm text-amber-700">
              Unable to refresh data — showing cached version.{' '}
              <button onClick={refresh} className="underline font-medium">Retry</button>
            </div>
          )}

          {errorCount > 0 && !loading && (
            <div className="bg-red-50 border-b border-red-200 px-10 py-3 text-sm text-red-700">
              {errorCount} data source{errorCount > 1 ? 's' : ''} failed to load.
              Check the Settings panel for details.
            </div>
          )}

          <main className="px-12 py-12" data-section={activeTab}>
            {renderSection()}
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
