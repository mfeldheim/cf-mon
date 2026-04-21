import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock graphql and kv modules
vi.mock('../src/graphql', () => ({
  fetchAllZones: vi.fn(),
  fetchZoneStats: vi.fn(),
}));
vi.mock('../src/kv', () => ({
  readStats: vi.fn(),
  writeStats: vi.fn(),
  appendHistory: vi.fn((stats, point) => ({ ...stats, history: [...stats.history, point] })),
  STATS_KEY: 'stats:all',
  MAX_HISTORY: 30,
}));

import { fetchAllZones, fetchZoneStats } from '../src/graphql';
import { readStats, writeStats } from '../src/kv';
import type { AccountStats } from '../src/types';
import type { Env } from '../src/types';

// Import after mocks
let workerModule: typeof import('../src/index');

const makeEnv = (): Env => ({
  STATS: {
    get: vi.fn(async () => null),
    put: vi.fn(async () => undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace,
  CF_API_TOKEN: 'test-token',
  CF_ACCOUNT_ID: 'test-account',
});

describe('Worker fetch handler', () => {
  beforeEach(async () => {
    vi.resetModules();
    workerModule = await import('../src/index');
  });

  it('returns 404 for unknown /api routes', async () => {
    const req = new Request('https://cf-mon.example.com/api/unknown');
    const env = makeEnv();
    const resp = await workerModule.default.fetch(req, env, {} as ExecutionContext);
    expect(resp.status).toBe(404);
  });

  it('returns cached stats from KV on GET /api/stats', async () => {
    const stats: AccountStats = {
      totalRps: 5, humanRps: 4, botRps: 1, unknownRps: 0,
      cacheHitRatio: 0.7, zoneCount: 1, zones: [], history: [], lastUpdated: 123,
    };
    vi.mocked(readStats).mockResolvedValueOnce(stats);

    const req = new Request('https://cf-mon.example.com/api/stats');
    const env = makeEnv();
    const resp = await workerModule.default.fetch(req, env, {} as ExecutionContext);
    expect(resp.status).toBe(200);
    const body = await resp.json() as AccountStats;
    expect(body.totalRps).toBe(5);
    expect(resp.headers.get('Content-Type')).toContain('application/json');
  });

  it('returns 503 when no stats cached yet', async () => {
    vi.mocked(readStats).mockResolvedValueOnce(null);
    const req = new Request('https://cf-mon.example.com/api/stats');
    const env = makeEnv();
    const resp = await workerModule.default.fetch(req, env, {} as ExecutionContext);
    expect(resp.status).toBe(503);
  });
});

describe('Worker scheduled handler', () => {
  beforeEach(async () => {
    vi.resetModules();
    workerModule = await import('../src/index');
  });

  it('fetches zones and writes aggregated stats', async () => {
    vi.mocked(readStats).mockResolvedValue(null);
    vi.mocked(fetchAllZones).mockResolvedValue([{ id: 'z1', name: 'zone1.com' }]);
    vi.mocked(fetchZoneStats).mockResolvedValue([{
      zoneId: 'z1', zoneName: 'zone1.com',
      requestsPerSecond: 10, humanRps: 8, botRps: 2, unknownRps: 0, cacheHitRatio: 0.6,
    }]);

    const env = makeEnv();
    const pendingPromises: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: vi.fn((p: Promise<unknown>) => { pendingPromises.push(p); }),
    } as unknown as ExecutionContext;
    await workerModule.default.scheduled({} as ScheduledEvent, env, ctx);
    await Promise.all(pendingPromises);

    expect(writeStats).toHaveBeenCalled();
    const written = vi.mocked(writeStats).mock.calls[0][1];
    expect(written.totalRps).toBeCloseTo(10);
    expect(written.zoneCount).toBe(1);
  });
});
