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
export function PositionRow({
  m,
  pos,
}: {
  m: UiMarket;
  pos: { yesAmount: bigint; noAmount: bigint; claimed: boolean };
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
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 py-2 text-sm">
      <span>
        YES ${formatUsdc(pos.yesAmount)} / NO ${formatUsdc(pos.noAmount)} —
        claim ≈ ${formatUsdc(payout ?? 0n)}
      </span>
      <div className="flex gap-2">
        <Link className="text-emerald-400" href={`/m/${m.pda}/receipt`}>
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
        >
          {busy ? "Confirming…" : pos.claimed ? "Claimed" : "Claim"}
        </Button>
      </div>
      {txErr && <span className="text-xs text-red-400">{txErr}</span>}
      {sig && (
        <a className="text-xs text-emerald-400" href={explorerTx(sig)}>
          tx →
        </a>
      )}
    </div>
  );
}
