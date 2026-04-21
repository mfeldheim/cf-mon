import type { AccountStats, HistoryPoint } from './types';

export const STATS_KEY = 'stats:all';
export const MAX_HISTORY = 30;

export async function readStats(kv: KVNamespace): Promise<AccountStats | null> {
  try {
    const raw = await kv.get(STATS_KEY, 'text');
    if (!raw) return null;
    return JSON.parse(raw) as AccountStats;
  } catch {
    return null;
  }
}

export async function writeStats(kv: KVNamespace, stats: AccountStats): Promise<void> {
  await kv.put(STATS_KEY, JSON.stringify(stats), { expirationTtl: 120 });
}

export function appendHistory(stats: AccountStats, point: HistoryPoint): AccountStats {
  const history = [...stats.history, point].slice(-MAX_HISTORY);
  return { ...stats, history };
}
