import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountStats } from '../types';

const POLL_MS = 60_000;

export function useStats() {
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<AccountStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const resp = await fetch('/api/stats');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json() as AccountStats;
      prevRef.current = data;
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // preserve previous stats on error
      if (prevRef.current) setStats(prevRef.current);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  return { stats, error };
}
