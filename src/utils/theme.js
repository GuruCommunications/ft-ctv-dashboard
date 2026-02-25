const DEFAULT_BRANDING = {
  primaryColor: '#1A3A6B',
  secondaryColor: '#2E7D32',
  accentColor: '#D32F2F',
  backgroundColor: '#F5F7FA',
  surfaceColor: '#FFFFFF',
  textColor: '#1E293B',
  textMuted: '#64748B',
  borderColor: '#E2E8F0',
};

export function applyTheme(branding = {}) {
  const theme = { ...DEFAULT_BRANDING, ...branding };
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-accent', theme.accentColor);
  root.style.setProperty('--color-bg', theme.backgroundColor);
  root.style.setProperty('--color-surface', theme.surfaceColor);
  root.style.setProperty('--color-text', theme.textColor);
  root.style.setProperty('--color-text-muted', theme.textMuted);
  root.style.setProperty('--color-border', theme.borderColor);
}

export function getChartColors(branding = {}) {
  const theme = { ...DEFAULT_BRANDING, ...branding };
  return [
    theme.primaryColor,
    theme.accentColor,
    theme.secondaryColor,
    '#F59E0B',
    '#7C3AED',
    '#06B6D4',
    '#EC4899',
    '#F97316',
    '#14B8A6',
    '#6366F1',
  ];
}

