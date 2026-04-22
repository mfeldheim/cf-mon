import type { Env, AccountStats, ZoneStats } from './types';
import { fetchAllZones, fetchZoneStats, type ZoneRef } from './graphql';
import { readStats, writeStats, appendHistory } from './kv';

const ZONES_KEY = 'zones:list';
const ZONES_TTL = 3600;

async function getCachedZones(kv: KVNamespace, apiToken: string, accountId: string): Promise<ZoneRef[]> {
  try {
    const raw = await kv.get(ZONES_KEY, 'text');
    if (raw) return JSON.parse(raw) as ZoneRef[];
  } catch {
    // fall through to fetch
  }
  const zones = await fetchAllZones(apiToken, accountId);
  if (zones.length > 0) {
    await kv.put(ZONES_KEY, JSON.stringify(zones), { expirationTtl: ZONES_TTL });
  }
  return zones;
}

async function runCron(env: Env): Promise<void> {
  const zones = await getCachedZones(env.STATS, env.CF_API_TOKEN, env.CF_ACCOUNT_ID);
  if (zones.length === 0) {
    console.error('runCron: no zones found, aborting');
    return;
  }

  console.log(`runCron: fetching stats for ${zones.length} zones`);
  const zoneStats: ZoneStats[] = await fetchZoneStats(zones, env.CF_API_TOKEN, env.CF_ACCOUNT_ID);
  console.log(`runCron: got stats for ${zoneStats.length} zones`);

  const totalRps = zoneStats.reduce((s, z) => s + z.requestsPerSecond, 0);
  const humanRps = zoneStats.reduce((s, z) => s + z.humanRps, 0);
  const botRps = zoneStats.reduce((s, z) => s + z.botRps, 0);
  const unknownRps = zoneStats.reduce((s, z) => s + z.unknownRps, 0);
  const totalReqs = zoneStats.reduce((s, z) => s + z.requestsPerSecond, 0);
  const cacheHitRatio =
    totalReqs > 0
      ? zoneStats.reduce((s, z) => s + z.cacheHitRatio * z.requestsPerSecond, 0) / totalReqs
      : 0;

  const existing = await readStats(env.STATS);
  const newStats: AccountStats = {
    totalRps,
    humanRps,
    botRps,
    unknownRps,
    cacheHitRatio,
    zoneCount: zoneStats.length,
    zones: zoneStats,
    history: existing?.history ?? [],
    lastUpdated: Date.now(),
  };

  const historyPoint = { timestamp: newStats.lastUpdated, totalRps, humanRps, botRps };
  const withHistory = appendHistory(newStats, historyPoint);

  await writeStats(env.STATS, withHistory);
}

async function handleStats(env: Env): Promise<Response> {
  const stats = await readStats(env.STATS);
  if (!stats) {
    return new Response(JSON.stringify({ error: 'No data yet' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/stats') return handleStats(env);
    if (url.pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }
    // Static assets served by Workers Assets binding
    return new Response('Not found', { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env));
  },
};
