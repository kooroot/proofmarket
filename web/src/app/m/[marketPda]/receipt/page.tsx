"use client";
import Link from "next/link";
import { ProofChain } from "@/components/ProofChain";
import { UmaContrastCard } from "@/components/UmaContrastCard";
import { adaptProofBundle } from "@/lib/proof";
import { epochDayFromTs } from "@/lib/market";
import { parseValidateStatResult } from "@/lib/validate-result";
import {
  MAINNET_HISTORICAL_REPLAY_ROUTE,
  MAINNET_TXLINE_PROGRAM_ID,
} from "@/lib/replay-demo";
import replayRaw from "../../../../../public/replay/18175918.json";

const MAINNET_VALIDATE_LOGS = [
  "Program log: Predicate evaluated to: true",
  `Program return: ${MAINNET_TXLINE_PROGRAM_ID} AQ==`,
];

export default function Receipt({ params }: { params: { marketPda: string } }) {
  const replay = replayRaw;
  const bundle = adaptProofBundle(replay.bundle);
  const epochDay = epochDayFromTs(bundle.ts);
  const validate = parseValidateStatResult(MAINNET_VALIDATE_LOGS, MAINNET_TXLINE_PROGRAM_ID);
  return (
    <div className="pt-[34px]" style={{ animation: "fadeUp .4s both" }}>
      <Link href={`/m/${params.marketPda}`} className="lk border-0 font-mono text-[11.5px]">
        ← Market
      </Link>
      <h1 className="mb-1 mt-4 font-display text-[clamp(1.9rem,3.4vw,2.7rem)] font-bold leading-[1.04] tracking-[-0.03em]">
        Argentina 3-2 Cape Verde
      </h1>
      <p className="mb-[22px] text-[15px] text-ink-2">TxLINE mainnet historical proof, replayed hash by hash.</p>

      <div className="mb-[26px] rounded-[3px] border border-l-[3px] border-revert bg-revert-soft px-[18px] py-[15px]">
        <div className="text-[13.5px] font-semibold text-revert">
          Live devnet markets use this as the deterministic receipt pattern.
        </div>
        <p className="mt-[6px] text-[13px] leading-[1.6] text-ink-2">
          Market {params.marketPda.slice(0, 8)}... links to this frozen mainnet proof so the receipt shows the full
          objective path: stat leaves, event-stat root, daily root PDA, validate_stat TRUE, and escrow release math.{" "}
          <Link className="lk" href={MAINNET_HISTORICAL_REPLAY_ROUTE}>
            Replay the fixture clock →
          </Link>
        </p>
      </div>

      <div className="grid gap-8 pb-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(16rem,1fr)] lg:gap-10">
        <ProofChain
          bundle={bundle}
          dailyRoot={replay.dailyRootPda}
          epochDay={epochDay}
          rootExists={true}
          validate={validate}
          resolveTx={replay.resolveTx ?? undefined}
          claimTxs={replay.claimTxs ?? []}
          dataNetwork="mainnet"
        />
        <aside>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2">Proof vs vote</div>
          <UmaContrastCard />
        </aside>
      </div>
    </div>
  );
}
