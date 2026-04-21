import { useStats } from './hooks/useStats';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { TrafficChart } from './components/TrafficChart';
import { ZoneCard } from './components/ZoneCard';

export default function App() {
  const { stats, error } = useStats();

  return (
    <div className="flex min-h-full flex-col">
      <Header
        lastUpdated={stats?.lastUpdated ?? null}
        zoneCount={stats?.zoneCount ?? 0}
      />

      <main className="flex flex-col gap-6 px-8 pb-12">
        {error && !stats && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">
            {error === 'HTTP 503'
              ? 'Waiting for first data collection (cron runs every minute)…'
              : `Error: ${error}`}
          </div>
        )}

        {stats ? (
          <>
            {/* Summary stat cards */}
            <SummaryCards stats={stats} />

            {/* Divider */}
            <div className="divider-glow" />

            {/* Traffic area chart */}
            <TrafficChart history={stats.history} />

            {/* Per-zone grid */}
            {stats.zones.length > 0 && (
              <section>
                <p className="label-eyebrow mb-3">Zones</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stats.zones
                    .slice()
                    .sort((a, b) => b.requestsPerSecond - a.requestsPerSecond)
                    .map(zone => (
                      <ZoneCard key={zone.zoneId} zone={zone} />
                    ))}
                </div>
              </section>
            )}
          </>
        ) : (
          !error && (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">
              Loading…
            </div>
          )
        )}
      </main>
    </div>
  );
}
