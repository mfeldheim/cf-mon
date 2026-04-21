import { useFlash } from '../hooks/useFlash';
import type { AccountStats } from '../types';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent: string; // tailwind color name e.g. 'sky', 'emerald', 'rose', 'amber', 'violet'
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  const flash = useFlash(value);

  const glowMap: Record<string, string> = {
    sky:     'rgba(56,189,248,0.35)',
    emerald: 'rgba(52,211,153,0.35)',
    rose:    'rgba(239,68,68,0.35)',
    amber:   'rgba(251,191,36,0.35)',
    violet:  'rgba(167,139,250,0.35)',
  };

  const textMap: Record<string, string> = {
    sky:     'text-sky-300',
    emerald: 'text-emerald-300',
    rose:    'text-rose-300',
    amber:   'text-amber-300',
    violet:  'text-violet-300',
  };

  const glowColor = glowMap[accent] ?? glowMap['sky'];
  const textColor = textMap[accent] ?? textMap['sky'];

  return (
    <div className="panel panel-hover flex flex-col gap-1 p-5 relative overflow-hidden">
      {/* glow blob */}
      <div
        className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl opacity-50"
        style={{ background: glowColor }}
      />
      <span className="label-eyebrow">{label}</span>
      <span
        className={`num text-2xl font-bold tabular-nums ${textColor} transition-colors duration-200 ${flash ? 'animate-value-flash' : ''}`}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
    </div>
  );
}

interface SummaryCardsProps {
  stats: AccountStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(1);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Total req/s"
        value={fmt(stats.totalRps)}
        sub="all zones"
        accent="sky"
      />
      <StatCard
        label="Human req/s"
        value={fmt(stats.humanRps)}
        sub="verified humans"
        accent="emerald"
      />
      <StatCard
        label="Bot req/s"
        value={fmt(stats.botRps)}
        sub="verified bots"
        accent="rose"
      />
      <StatCard
        label="Cache hit"
        value={pct(stats.cacheHitRatio)}
        sub="cached / total"
        accent="amber"
      />
      <StatCard
        label="Zones"
        value={String(stats.zoneCount)}
        sub="active zones"
        accent="violet"
      />
    </div>
  );
}
