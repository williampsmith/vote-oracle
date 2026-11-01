export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <radialGradient id="lg" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffd9a8" />
            <stop offset=".45" stopColor="#f06a2a" />
            <stop offset="1" stopColor="#5a1d0b" />
          </radialGradient>
        </defs>
        <circle cx="16" cy="14" r="11" fill="url(#lg)" />
        <path d="M7 27h18" stroke="#f7f1e8" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 23.5h8" stroke="#f7f1e8" strokeWidth="2.2" strokeLinecap="round" opacity=".6" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">Vote Oracle</span>
    </div>
  );
}
