import { describe, it, expect, vi } from 'vitest';
import { readStats, writeStats, appendHistory, STATS_KEY, MAX_HISTORY } from '../src/kv';
import type { AccountStats, HistoryPoint } from '../src/types';

function makeKV(stored: string | null): KVNamespace {
  return {
    get: vi.fn(async () => stored),
    put: vi.fn(async () => undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

const baseStats: AccountStats = {
  totalRps: 10,
  humanRps: 8,
  botRps: 2,
  unknownRps: 0,
  cacheHitRatio: 0.5,
  zoneCount: 2,
  zones: [],
  history: [],
  lastUpdated: 1000,
};

describe('readStats', () => {
  it('returns null when KV has no data', async () => {
    const kv = makeKV(null);
    const result = await readStats(kv);
    expect(result).toBeNull();
    expect(kv.get).toHaveBeenCalledWith(STATS_KEY, 'text');
  });

  it('returns parsed AccountStats when data exists', async () => {
    const kv = makeKV(JSON.stringify(baseStats));
    const result = await readStats(kv);
    expect(result).toEqual(baseStats);
  });

  it('returns null on invalid JSON', async () => {
    const kv = makeKV('not-json{{{');
    const result = await readStats(kv);
    expect(result).toBeNull();
  });
});

describe('writeStats', () => {
  it('puts JSON-serialised stats with 120s TTL', async () => {
    const kv = makeKV(null);
    await writeStats(kv, baseStats);
    expect(kv.put).toHaveBeenCalledWith(STATS_KEY, JSON.stringify(baseStats), { expirationTtl: 120 });
  });
});

describe('appendHistory', () => {
  it('appends a new history point', () => {
    const point: HistoryPoint = { timestamp: 2000, totalRps: 5, humanRps: 4, botRps: 1 };
    const result = appendHistory(baseStats, point);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toEqual(point);
  });

  it(`keeps at most ${MAX_HISTORY} history points`, () => {
    const history: HistoryPoint[] = Array.from({ length: MAX_HISTORY }, (_, i) => ({
      timestamp: i,
      totalRps: i,
      humanRps: i,
      botRps: 0,
    }));
    const statsWithHistory: AccountStats = { ...baseStats, history };
    const newPoint: HistoryPoint = { timestamp: MAX_HISTORY, totalRps: 99, humanRps: 99, botRps: 0 };
    const result = appendHistory(statsWithHistory, newPoint);
    expect(result.history).toHaveLength(MAX_HISTORY);
    expect(result.history[MAX_HISTORY - 1]).toEqual(newPoint);
  });

  it('does not mutate the original stats', () => {
    const point: HistoryPoint = { timestamp: 9999, totalRps: 1, humanRps: 1, botRps: 0 };
    appendHistory(baseStats, point);
    expect(baseStats.history).toHaveLength(0);
  });
});
