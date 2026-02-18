import {
  LayoutDashboard, BarChart3, Tv, Users, Paintbrush,
  Target, Radio, PieChart, MapPin, Settings
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Summary', icon: LayoutDashboard },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
  { key: 'channel', label: 'Channel', icon: Tv },
  { key: 'audiences', label: 'Audiences', icon: Users },
  { key: 'creative', label: 'Creative', icon: Paintbrush },
  { key: 'conversions', label: 'Conversions', icon: Target },
  { key: 'linearTV', label: 'Linear TV', icon: Radio },
  { key: 'demographics', label: 'Demographics', icon: PieChart },
  { key: 'geographic', label: 'Geographic', icon: MapPin },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Navigation({ activeTab, onTabChange, availableTabs }) {
  const visibleTabs = TABS.filter(tab =>
    tab.key === 'settings' || !availableTabs || availableTabs.includes(tab.key)
  );

  return (
    <nav className="w-60 shrink-0 bg-white border-r border-[var(--color-border)] min-h-[calc(100vh-104px)] pt-8 pb-8">
      <div className="px-5 mb-5">
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.15em]">
          Navigation
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-3 w-full px-4 py-3 text-[14px] font-medium rounded-lg transition-all text-left tracking-wide ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
