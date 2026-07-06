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
  const validate = parseValidateStatResult(
    MAINNET_VALIDATE_LOGS,
    MAINNET_TXLINE_PROGRAM_ID
  );
  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:p-6">
      <div className="rounded-xl bg-zinc-950 p-3 text-zinc-100 sm:rounded-2xl sm:p-6">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Argentina 3-2 Cape Verde</h1>
        <p className="text-sm text-zinc-400">TxLINE mainnet historical proof, replayed hash by hash.</p>
        <div className="my-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <div className="font-medium">Live devnet markets use this as the deterministic receipt pattern.</div>
          <p className="mt-1 text-amber-100/80">
            Market {params.marketPda.slice(0, 8)}... links to this frozen mainnet proof so the receipt shows the full objective path: stat leaves, event-stat root, daily root PDA, validate_stat TRUE, and escrow release math.
          </p>
          <Link className="mt-2 inline-block text-emerald-300" href={MAINNET_HISTORICAL_REPLAY_ROUTE}>Replay the fixture clock →</Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:gap-6">
          <ProofChain bundle={bundle} dailyRoot={replay.dailyRootPda} epochDay={epochDay} rootExists={true} validate={validate} resolveTx={replay.resolveTx ?? undefined} claimTxs={replay.claimTxs ?? []} dataNetwork="mainnet" />
          <UmaContrastCard />
        </div>
      </div>
    </div>
  );
}
