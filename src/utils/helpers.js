/** Safely parse JSON with a fallback value */
export function safeParseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

/** Strip sensitive fields before persisting config to localStorage */
export function stripSecrets(config) {
  if (!config) return config;
  const safe = { ...config };
  delete safe.proxyToken;
  return safe;
}

/** Validate a URL belongs to an expected origin */
const ALLOWED_PROXY_ORIGINS = ['https://script.google.com'];

export function isAllowedProxyUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_PROXY_ORIGINS.some(origin => parsed.origin === origin);
  } catch {
    return false;
  }
}

/** Validate a data source value is a numeric GID */
export function isValidGid(value) {
  return /^\d+$/.test(value);
}
