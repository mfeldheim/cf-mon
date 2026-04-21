interface HeaderProps {
  lastUpdated: number | null;
  zoneCount: number;
}

export function Header({ lastUpdated, zoneCount }: HeaderProps) {
  const timeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <header className="flex items-center justify-between gap-4 py-6 px-8">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #3b63ff 100%)',
            boxShadow: '0 0 20px -4px rgba(249,115,22,0.5)',
          }}
        >
          {/* Cloudflare-ish "cloud + bolt" icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M14.5 8.5C14.5 6.01 12.49 4 10 4C7.85 4 6.06 5.5 5.6 7.5H5C3.34 7.5 2 8.84 2 10.5C2 12.16 3.34 13.5 5 13.5H14.5C15.88 13.5 17 12.38 17 11C17 9.62 15.88 8.5 14.5 8.5Z"
              fill="white"
              fillOpacity="0.9"
            />
            <path d="M10 10L8.5 13H10.5L9 17L13.5 11H11L12.5 7.5L10 10Z" fill="#f97316" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white">cf-mon</h1>
          <p className="text-[10px] text-gray-500 tracking-wide uppercase">Cloudflare Traffic Monitor</p>
        </div>
      </div>

      {/* Right side: live indicator + meta */}
      <div className="flex items-center gap-3">
        {zoneCount > 0 && (
          <span className="chip chip-info">
            {zoneCount} zone{zoneCount !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot"
            style={{ boxShadow: '0 0 6px 1px rgba(52,211,153,0.6)' }}
          />
          <span className="font-mono">{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
