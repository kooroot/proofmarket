import { Fragment } from "react";

export function UmaContrastCard() {
  const rows: [string, string][] = [
    ["Correct by construction — cryptographic proof", "Correct by economic incentive — + dispute game"],
    ["Deterministic: TRUE/FALSE from a signed stat", "Subjective-capable: depends on voter turnout & honesty"],
    ["Escrow CPIs validate_stat, gates funds on the bool", "Resolution = a vote that can be wrong if undisputed"],
    ["Resolves in 1 proof tx; no challenge window", "Multi-hour commit/reveal + dispute → re-vote / escalation"],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 border-t-2 border-ink">
        <div className="border-b border-r border-rule py-3 pr-[18px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-proof">ProofMarket</span>
        </div>
        <div className="border-b border-rule py-3 pl-[18px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-revert">
            Optimistic oracle · Polymarket-style
          </span>
        </div>
        {rows.map(([l, r], i) => (
          <Fragment key={i}>
            <div className="flex gap-[9px] border-b border-r border-rule py-[13px] pr-[18px] text-[13.5px] leading-[1.5]">
              <span className="font-bold text-proof">+</span>
              <span>{l}</span>
            </div>
            <div className="flex gap-[9px] border-b border-rule py-[13px] pl-[18px] text-[13.5px] leading-[1.5] text-ink-2">
              <span className="text-revert">–</span>
              <span>{r}</span>
            </div>
          </Fragment>
        ))}
      </div>
      <p className="mt-4 max-w-[660px] text-[13px] leading-[1.6] text-ink-2">{`For "how many corners," you don't need 103 people to vote.`}</p>
    </div>
  );
}
