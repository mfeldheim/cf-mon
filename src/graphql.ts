import type { ZoneStats } from './types';

export const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
export const WINDOW_SECONDS = 60;
const BATCH_SIZE = 10;

export interface ZoneRef {
  id: string;
  name: string;
}

interface RawZoneData {
  totalCount: number;
  cachedRequests: number;
  botCount: number;
  cacheHitRatio: number;
}

export function parseZoneData(zoneId: string, zoneName: string, raw: RawZoneData): ZoneStats {
  const { totalCount, botCount, cacheHitRatio } = raw;

  const requestsPerSecond = totalCount / WINDOW_SECONDS;
  const botRps = botCount / WINDOW_SECONDS;
  const humanRps = Math.max(0, (totalCount - botCount) / WINDOW_SECONDS);
  const unknownRps = 0;

  return { zoneId, zoneName, requestsPerSecond, humanRps, botRps, unknownRps, cacheHitRatio };
}

function buildBatchQuery(zones: ZoneRef[]): string {
  const zoneIds = zones.map(z => `"${z.id}"`).join(', ');
  const since = windowStart();
  return `{
    viewer {
      zones(filter: { zoneTag_in: [${zoneIds}] }) {
        zoneTag
        traffic: httpRequestsAdaptiveGroups(
          filter: { datetime_geq: "${since}" }
          limit: 10000
        ) {
          count
          avg { sampleInterval }
          dimensions { cacheStatus verifiedBotCategory }
        }
      }
    }
  }`;
}

function windowStart(): string {
  return new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
}

export async function fetchZoneStats(
  zones: ZoneRef[],
  apiToken: string,
  _accountId: string,
): Promise<ZoneStats[]> {
  const results: ZoneStats[] = [];

  for (let i = 0; i < zones.length; i += BATCH_SIZE) {
    const batch = zones.slice(i, i + BATCH_SIZE);
    try {
      const resp = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: buildBatchQuery(batch) }),
      });

      if (!resp.ok) {
        console.error(`fetchZoneStats batch: HTTP ${resp.status}`);
        continue;
      }

      const json = await resp.json() as {
        data: { viewer: { zones: Array<{
          zoneTag: string;
          traffic: Array<{
            count: number;
            avg: { sampleInterval: number };
            dimensions: { cacheStatus: string; verifiedBotCategory: string };
          }>;
        }> } };
        errors?: Array<{ message: string }>;
      };

      if (json.errors?.length) {
        console.error('fetchZoneStats GraphQL errors:', JSON.stringify(json.errors));
      }

      console.log(`fetchZoneStats batch: got ${json.data?.viewer?.zones?.length ?? 0} zones`);

      const zoneNameMap = new Map(batch.map(z => [z.id, z.name]));

      for (const zone of json.data?.viewer?.zones ?? []) {
        // count is samples; multiply by sampleInterval for actual requests
        const totalCount = zone.traffic.reduce((s, r) => s + r.count * r.avg.sampleInterval, 0);
        const hitCount   = zone.traffic
          .filter(r => r.dimensions.cacheStatus === 'hit')
          .reduce((s, r) => s + r.count * r.avg.sampleInterval, 0);
        const botCount   = zone.traffic
          .filter(r => r.dimensions.verifiedBotCategory !== '')
          .reduce((s, r) => s + r.count * r.avg.sampleInterval, 0);
        const cacheHitRatio = totalCount > 0 ? hitCount / totalCount : 0;
        const zoneName = zoneNameMap.get(zone.zoneTag) ?? zone.zoneTag;
        results.push(parseZoneData(zone.zoneTag, zoneName, { totalCount, cachedRequests: hitCount, botCount, cacheHitRatio }));
      }
    } catch (err) {
      console.error('fetchZoneStats batch error:', err);
    }
  }

  return results;
}

export async function fetchAllZones(
  apiToken: string,
  accountId: string,
): Promise<ZoneRef[]> {
  const zones: ZoneRef[] = [];
  let page = 1;

  try {
    while (true) {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/zones?account.id=${accountId}&per_page=50&page=${page}&status=active`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!resp.ok) {
        console.error(`fetchAllZones: HTTP ${resp.status}`, await resp.text());
        break;
      }

      const json = await resp.json() as {
        result: Array<{ id: string; name: string }>;
        result_info: { page: number; total_pages: number };
      };

      for (const z of json.result) {
        zones.push({ id: z.id, name: z.name });
      }

      if (json.result_info.page >= json.result_info.total_pages) break;
      page++;
    }
  } catch (err) {
    console.error('fetchAllZones error:', err);
  }

  console.log(`fetchAllZones: found ${zones.length} zones`);
  return zones;
}
