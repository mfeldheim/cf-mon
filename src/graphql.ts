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
}

export function parseZoneData(zoneId: string, zoneName: string, raw: RawZoneData): ZoneStats {
  const { totalCount, cachedRequests, botCount } = raw;

  const requestsPerSecond = totalCount / WINDOW_SECONDS;
  const botRps = botCount / WINDOW_SECONDS;
  const humanRps = Math.max(0, (totalCount - botCount) / WINDOW_SECONDS);
  const unknownRps = 0;
  const cacheHitRatio = totalCount > 0 ? cachedRequests / totalCount : 0;

  return { zoneId, zoneName, requestsPerSecond, humanRps, botRps, unknownRps, cacheHitRatio };
}

function buildBatchQuery(zones: ZoneRef[]): string {
  const zoneIds = zones.map(z => `"${z.id}"`).join(', ');
  return `{
    viewer {
      zones(filter: { zoneTag_in: [${zoneIds}] }) {
        zoneTag
        zoneName
        total: httpRequestsAdaptiveGroups(
          filter: { datetime_geq: "${windowStart()}" }
          limit: 1
        ) {
          count
          sum { cachedRequests }
        }
        bots: httpRequestsAdaptiveGroups(
          filter: { datetime_geq: "${windowStart()}", isVerifiedBot: true }
          limit: 1
        ) {
          count
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

      if (!resp.ok) continue;

      const json = await resp.json() as {
        data: { viewer: { zones: Array<{
          zoneTag: string;
          zoneName: string;
          total: Array<{ count: number; sum: { cachedRequests: number } }>;
          bots: Array<{ count: number }>;
        }> } };
      };

      for (const zone of json.data.viewer.zones) {
        const totalCount = zone.total[0]?.count ?? 0;
        const cachedRequests = zone.total[0]?.sum?.cachedRequests ?? 0;
        const botCount = zone.bots[0]?.count ?? 0;
        results.push(parseZoneData(zone.zoneTag, zone.zoneName, { totalCount, cachedRequests, botCount }));
      }
    } catch {
      // skip batch on network error
    }
  }

  return results;
}

export async function fetchAllZones(
  apiToken: string,
  accountId: string,
): Promise<ZoneRef[]> {
  const query = `{
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        zones: zonesMemberships {
          node { id name }
        }
      }
    }
  }`;

  try {
    const resp = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!resp.ok) return [];

    const json = await resp.json() as {
      data: { viewer: { accounts: Array<{ zones: Array<{ node: { id: string; name: string } }> }> } };
    };

    return json.data.viewer.accounts[0]?.zones.map(z => ({ id: z.node.id, name: z.node.name })) ?? [];
  } catch {
    return [];
  }
}
