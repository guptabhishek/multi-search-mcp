// Provider list is set via SEARCH_PROVIDERS env variable (comma-separated string only), defaults to all available
const ALL_PROVIDERS = ['tavily', 'google', 'duckduckgo', 'brave'];

function parseProviders(val: any): string[] {
  if (!val) return ALL_PROVIDERS;
  return String(val).split(',').map(p => p.trim()).filter(Boolean);
}

export const PROVIDER_LIST: string[] = parseProviders(process.env.SEARCH_PROVIDERS);

export const SEARCH_STRATEGY: 'priority' | 'random' =
  (process.env.SEARCH_STRATEGY === 'priority' ? 'priority' : 'random');

export const DEFAULT_NUM_RESULTS = 10;
