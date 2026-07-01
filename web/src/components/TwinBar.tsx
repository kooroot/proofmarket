export function TwinBar({ pYes, pFair }: { pYes: number; pFair: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative h-3 w-40 rounded bg-zinc-800" data-bar>
          <div className="absolute inset-y-0 left-0 rounded bg-emerald-500" style={{ width: `${Math.round(pYes * 100)}%` }} />
        </div>
        <span className="text-sm tabular-nums">{Math.round(pYes * 100)}%</span>
      </div>
      {pFair !== null && (
        <div className="flex items-center gap-2">
          <div className="relative h-2 w-40 rounded border border-amber-400/70" data-bar>
            <div className="absolute inset-y-0 left-0 rounded bg-amber-400/30" style={{ width: `${Math.round(pFair * 100)}%` }} />
          </div>
          <span className="text-xs text-amber-300/80 tabular-nums">fair {Math.round(pFair * 100)}% <span className="opacity-60">indicative</span></span>
        </div>
      )}
    </div>
  );
}
