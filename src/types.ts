export interface HistoryPoint {
  timestamp: number;
  totalRps: number;
  humanRps: number;
  botRps: number;
}

export interface ZoneStats {
  zoneId: string;
  zoneName: string;
  requestsPerSecond: number;
  humanRps: number;
  botRps: number;
  unknownRps: number;
  cacheHitRatio: number;
}

export interface AccountStats {
  totalRps: number;
  humanRps: number;
  botRps: number;
  unknownRps: number;
  cacheHitRatio: number;
  zoneCount: number;
  zones: ZoneStats[];
  history: HistoryPoint[];
  lastUpdated: number;
}

export interface Env {
  STATS: KVNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
}
