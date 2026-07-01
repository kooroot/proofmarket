import { Fragment } from "react";
export function UmaContrastCard() {
  const rows: [string, string][] = [
    ["Correct by construction — cryptographic proof", "Correct by economic incentive — + dispute game"],
    ["Deterministic: TRUE/FALSE from a signed stat", "Subjective-capable: depends on voter turnout & honesty"],
    ["Escrow CPIs validate_stat, gates funds on the bool", "Resolution = a vote that can be wrong if undisputed"],
    ["Resolves in 1 proof tx; no challenge window", "Multi-hour commit/reveal + dispute → re-vote / escalation"],
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="font-semibold text-emerald-400">ProofMarket</div><div className="font-semibold text-amber-400">Optimistic oracle (Polymarket-style)</div>
        {rows.map(([l, r], i) => (
          <Fragment key={i}>
            <div className="rounded bg-emerald-950/40 border border-emerald-800/50 p-2">{l}</div>
            <div className="rounded bg-amber-950/40 border border-amber-800/50 p-2">{r}</div>
          </Fragment>
        ))}
      </div>
      <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-2">{`An optimistic oracle can resolve any subjective question; ProofMarket resolves only predicates over the objective match stats TxLINE signs. For "how many corners," you don't need 103 people to vote.`}</p>
    </div>
  );
}
