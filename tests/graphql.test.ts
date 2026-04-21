import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseZoneData, fetchZoneStats, WINDOW_SECONDS } from '../src/graphql';

describe('parseZoneData', () => {
  it('computes rps from total count', () => {
    const result = parseZoneData('zone1', 'example.com', {
      totalCount: 600,
      cachedRequests: 300,
      botCount: 120,
    });
    expect(result.requestsPerSecond).toBeCloseTo(600 / WINDOW_SECONDS);
    expect(result.botRps).toBeCloseTo(120 / WINDOW_SECONDS);
    expect(result.humanRps).toBeCloseTo((600 - 120) / WINDOW_SECONDS);
    expect(result.cacheHitRatio).toBeCloseTo(0.5);
  });

  it('clamps humanRps to 0 when bots exceed total (data anomaly)', () => {
    const result = parseZoneData('zone1', 'example.com', {
      totalCount: 100,
      cachedRequests: 0,
      botCount: 200,
    });
    expect(result.humanRps).toBe(0);
    expect(result.unknownRps).toBe(0);
  });

  it('returns zero cacheHitRatio when totalCount is 0', () => {
    const result = parseZoneData('zone1', 'example.com', {
      totalCount: 0,
      cachedRequests: 0,
      botCount: 0,
    });
    expect(result.cacheHitRatio).toBe(0);
    expect(result.requestsPerSecond).toBe(0);
  });

  it('sets zone id and name', () => {
    const result = parseZoneData('abc123', 'test.dev', {
      totalCount: 60,
      cachedRequests: 30,
      botCount: 0,
    });
    expect(result.zoneId).toBe('abc123');
    expect(result.zoneName).toBe('test.dev');
  });
});

describe('fetchZoneStats', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('returns parsed zone stats from GraphQL response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            zones: [
              {
                zoneTag: 'z1',
                zoneName: 'alpha.com',
                total: [{ count: 120, sum: { cachedRequests: 60 } }],
                bots:  [{ count: 30 }],
              },
            ],
          },
        },
      }),
    });

    const results = await fetchZoneStats([{ id: 'z1', name: 'alpha.com' }], 'tok', 'acct');
    expect(results).toHaveLength(1);
    expect(results[0].zoneName).toBe('alpha.com');
    expect(results[0].requestsPerSecond).toBeCloseTo(120 / WINDOW_SECONDS);
    expect(results[0].botRps).toBeCloseTo(30 / WINDOW_SECONDS);
  });

  it('returns empty array on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const results = await fetchZoneStats([{ id: 'z1', name: 'alpha.com' }], 'tok', 'acct');
    expect(results).toEqual([]);
  });

  it('batches zones in groups of 10', async () => {
    const zones = Array.from({ length: 15 }, (_, i) => ({ id: `z${i}`, name: `zone${i}.com` }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          viewer: {
            zones: zones.slice(0, 10).map(z => ({
              zoneTag: z.id,
              zoneName: z.name,
              total: [{ count: 60, sum: { cachedRequests: 30 } }],
              bots:  [{ count: 0 }],
            })),
          },
        },
      }),
    });

    await fetchZoneStats(zones, 'tok', 'acct');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
