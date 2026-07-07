"use client";
import Link from "next/link";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getProgram } from "@/lib/program";
import { buildClaimIx, claimable } from "@/lib/tx-claim";
import { payoutForStake, formatUsdc } from "@/lib/parimutuel";
import { OUTCOME, type UiMarket } from "@/lib/market";
import { explorerTx } from "@/lib/constants";
import { demoMarketCopy } from "@/lib/demo-market";
import type { MainnetFixturePreviewItem } from "@/lib/mainnet-preview";
export function PositionRow({
  m,
  pos,
  demoFixture,
}: {
  m: UiMarket;
  pos: { yesAmount: bigint; noAmount: bigint; claimed: boolean };
  demoFixture?: MainnetFixturePreviewItem | null;
}) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [sig, setSig] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const won =
    m.outcome === OUTCOME.Yes
      ? pos.yesAmount
      : m.outcome === OUTCOME.No
      ? pos.noAmount
      : 0n;
  const payout =
    won > 0n
      ? payoutForStake(
          won,
          m.outcome === OUTCOME.Yes,
          m.yesPool,
          m.noPool,
          m.feeBps
        )
      : 0n;
  const outcomeLabel = m.outcome === OUTCOME.Yes ? "YES" : m.outcome === OUTCOME.No ? "NO" : "VOID";
  const demo = demoFixture ? demoMarketCopy(m, demoFixture) : null;
  return (
    <div className="flex flex-col gap-2 border-b border-rule px-1 py-[15px] text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 break-words">
        {demo ? (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-[3px] border border-proof px-[7px] py-[2px] font-mono text-[10px] text-proof">
                {demo.marketIcon} {demo.marketType}
              </span>
              <span className="font-mono text-[10.5px] text-ink-2">{demo.fixtureTitle}</span>
              <span className="rounded-[3px] bg-proof px-[7px] py-[2px] font-mono text-[10px] font-semibold text-paper">
                {won > 0n ? "WON" : "SETTLED"} · {outcomeLabel}
              </span>
            </div>
            <div className="font-display text-[17px]">{demo.question}</div>
          </>
        ) : null}
        <div className="mt-1 font-mono text-[11.5px] tabular-nums text-ink-2">
          YES ${formatUsdc(pos.yesAmount)} / NO ${formatUsdc(pos.noAmount)} — claim ≈ ${formatUsdc(payout ?? 0n)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 whitespace-nowrap">
        <Link className="font-mono text-[11.5px] text-proof hover:underline" href={`/m/${m.pda}/receipt`}>
          View Proof Receipt →
        </Link>
        <Button
          size="sm"
          disabled={!wallet || !claimable(m, pos) || busy}
          onClick={async () => {
            setTxErr(null);
            setBusy(true);
            try {
              const provider = new AnchorProvider(connection, wallet!, {});
              const program = getProgram(provider);
              const ix = await buildClaimIx(program, {
                market: new PublicKey(m.pda),
                owner: wallet!.publicKey,
              });
              setSig(await provider.sendAndConfirm(new Transaction().add(ix)));
            } catch (e) {
              setTxErr(e instanceof Error ? e.message : "Transaction failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-[3px] bg-proof font-mono text-[12.5px] font-semibold text-paper hover:brightness-110"
        >
          {busy ? "Confirming…" : pos.claimed ? "Claimed" : "Claim"}
        </Button>
      </div>
      {txErr && <span className="break-words font-mono text-[11px] text-revert">{txErr}</span>}
      {sig && (
        <a className="block break-all font-mono text-[11px] text-proof underline" href={explorerTx(sig)}>
          tx →
        </a>
      )}
    </div>
  );
}
