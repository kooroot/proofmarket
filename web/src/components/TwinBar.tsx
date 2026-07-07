export function TwinBar({ pYes, pFair }: { pYes: number; pFair: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative h-3 w-40 overflow-hidden rounded-[2px] bg-panel-2" data-bar>
          <div className="absolute inset-y-0 left-0 bg-proof" style={{ width: `${Math.round(pYes * 100)}%` }} />
        </div>
        <span className="font-mono text-sm tabular-nums text-ink">{Math.round(pYes * 100)}%</span>
      </div>
      {pFair !== null && (
        <div className="flex items-center gap-2">
          <div className="relative h-2 w-40 overflow-hidden rounded-[2px] border border-rule-2" data-bar>
            <div className="absolute inset-y-0 left-0 bg-rule-2" style={{ width: `${Math.round(pFair * 100)}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-ink-2">
            fair {Math.round(pFair * 100)}% <span className="opacity-60">indicative</span>
          </span>
        </div>
      )}
    </div>
  );
}
