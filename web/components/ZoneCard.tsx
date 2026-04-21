import { useFlash } from '../hooks/useFlash';
import type { ZoneStats } from '../types';

interface ZoneCardProps {
  zone: ZoneStats;
}

function cacheChipClass(ratio: number): string {
  if (ratio >= 0.7) return 'chip-ok';
  if (ratio >= 0.4) return 'chip-warn';
  return 'chip-bad';
}

export function ZoneCard({ zone }: ZoneCardProps) {
  const flash = useFlash(zone.requestsPerSecond);
  const total = zone.requestsPerSecond;

  const humanPct  = total > 0 ? (zone.humanRps / total) * 100 : 0;
  const botPct    = total > 0 ? (zone.botRps   / total) * 100 : 0;
  const unknownPct = Math.max(0, 100 - humanPct - botPct);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(1);

  return (
    <div className="panel panel-hover flex flex-col gap-3 p-4">
      {/* Zone name + cache chip */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="max-w-[70%] truncate text-sm font-semibold text-white"
          title={zone.zoneName}
        >
          {zone.zoneName}
        </p>
        <span className={`chip ${cacheChipClass(zone.cacheHitRatio)} shrink-0`}>
          {(zone.cacheHitRatio * 100).toFixed(0)}% cache
        </span>
      </div>

      {/* req/s */}
      <div>
        <span className="label-eyebrow">req/s</span>
        <p
          className={`num text-xl font-bold text-sky-300 tabular-nums transition-colors duration-200 ${flash ? 'animate-value-flash' : ''}`}
        >
          {fmt(zone.requestsPerSecond)}
        </p>
      </div>

      {/* human / bot / unknown breakdown */}
      <div className="flex flex-col gap-1">
        {/* progress bar */}
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="bg-emerald-400/70 transition-all duration-500"
            style={{ width: `${humanPct}%` }}
          />
          <div
            className="bg-rose-400/70 transition-all duration-500"
            style={{ width: `${botPct}%` }}
          />
          {unknownPct > 0.5 && (
            <div
              className="bg-gray-500/50 transition-all duration-500"
              style={{ width: `${unknownPct}%` }}
            />
          )}
        </div>

        {/* legend */}
        <div className="flex gap-3 text-[10px] text-gray-500">
          <span><span className="text-emerald-400">▪</span> {fmt(zone.humanRps)}/s human</span>
          <span><span className="text-rose-400">▪</span> {fmt(zone.botRps)}/s bot</span>
          {zone.unknownRps > 0 && (
            <span><span className="text-gray-400">▪</span> {fmt(zone.unknownRps)}/s unknown</span>
          )}
        </div>
      </div>
    </div>
  );
}
