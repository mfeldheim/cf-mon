import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, type TooltipProps,
} from 'recharts';
import type { HistoryPoint } from '../types';

interface TrafficChartProps {
  history: HistoryPoint[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const time = label
    ? new Date(label as number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      <p className="mb-1.5 font-mono text-gray-400">{time}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-300 capitalize">{entry.name}:</span>
          <span className="font-mono font-medium text-white">
            {(entry.value as number).toFixed(1)}/s
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrafficChart({ history }: TrafficChartProps) {
  if (history.length < 2) {
    return (
      <div className="panel flex h-48 items-center justify-center text-sm text-gray-500">
        Collecting traffic data…
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <p className="label-eyebrow mb-4">Traffic history</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradHuman" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradBot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f87171" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}/s`}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone" dataKey="totalRps" name="total"
            stroke="#38bdf8" strokeWidth={1.5}
            fill="url(#gradTotal)"
          />
          <Area
            type="monotone" dataKey="humanRps" name="human"
            stroke="#34d399" strokeWidth={1.5}
            fill="url(#gradHuman)"
          />
          <Area
            type="monotone" dataKey="botRps" name="bot"
            stroke="#f87171" strokeWidth={1.5}
            fill="url(#gradBot)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
