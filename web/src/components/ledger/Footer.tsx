import Link from "next/link";
import { MAINNET_HISTORICAL_REPLAY_ROUTE } from "@/lib/replay-demo";

export function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-[26px] px-7 py-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="font-display text-[22px] font-bold tracking-[-0.02em]">ProofMarket</div>
          <p className="mt-2 max-w-[230px] text-[12.5px] leading-[1.6] text-ink-2">
            No vote. No dispute window. Just math. Devnet settlement · play-money.
          </p>
        </div>
        <div>
          <div className="mb-[10px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">Ledger</div>
          <div className="flex flex-col gap-[7px] text-[13px]">
            <Link href="/" className="lk w-fit border-0">Index</Link>
            <Link href={MAINNET_HISTORICAL_REPLAY_ROUTE} className="lk w-fit border-0">Replay</Link>
            <Link href="/portfolio" className="lk w-fit border-0">Portfolio</Link>
          </div>
        </div>
        <div>
          <div className="mb-[10px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">On-chain</div>
          <div className="flex flex-col gap-[7px] font-mono text-[11px] text-ink-2">
            <span>program 6QNd5m…LZuEb</span>
            <span>mint 2MYAvD…HA8LT</span>
            <span>cluster devnet</span>
          </div>
        </div>
        <div>
          <div className="mb-[10px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">Data</div>
          <div className="flex flex-col gap-[7px] text-[13px] text-ink-2">
            <span>TxLINE World Cup</span>
            <span>SL1 · SL12 free tiers</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1160px] px-7 pb-[30px] font-mono text-[10.5px] text-ink-2">
        TxODDS World Cup Hackathon · Track 1 — Prediction Markets &amp; Settlement
      </div>
    </footer>
  );
}
