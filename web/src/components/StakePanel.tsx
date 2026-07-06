"use client";
import { useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getProgram } from "@/lib/program";
import { buildStakeIx, validateStakeAmount } from "@/lib/tx-stake";
import { payoutForStake, formatUsdc } from "@/lib/parimutuel";
import type { UiMarket } from "@/lib/market";
import { explorerTx } from "@/lib/constants";
export function StakePanel({ m }: { m: UiMarket }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();
  const [side, setSide] = useState(true);
  const [usdc, setUsdc] = useState("50");
  const [sig, setSig] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const amountBase = BigInt(Math.round(parseFloat(usdc || "0") * 1e6));
  const err = validateStakeAmount(amountBase);
  const preview = payoutForStake(
    amountBase,
    side,
    m.yesPool,
    m.noPool,
    m.feeBps
  );
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-3 sm:p-4">
      <ToggleGroup
        className="grid w-full grid-cols-2"
        value={side ? ["yes"] : ["no"]}
        onValueChange={(v) => {
          if (v.length > 0) setSide(v[v.length - 1] === "yes");
        }}
      >
        <ToggleGroupItem className="w-full" value="yes">YES</ToggleGroupItem>
        <ToggleGroupItem className="w-full" value="no">NO</ToggleGroupItem>
      </ToggleGroup>
      <Input
        className="w-full"
        value={usdc}
        onChange={(e) => setUsdc(e.target.value)}
        placeholder="USDC"
      />
      <p className="break-words text-sm text-zinc-400">
        {preview !== null
          ? `if ${side ? "YES" : "NO"}, you claim ≈ ${formatUsdc(preview)} USDC`
          : "one-sided pool — would Void & refund"}
      </p>
      <Button
        disabled={!wallet || !!err || busy}
        onClick={async () => {
          setTxErr(null);
          setBusy(true);
          try {
            const provider = new AnchorProvider(connection, wallet!, {});
            const program = getProgram(provider);
            const ix = await buildStakeIx(program, {
              market: new PublicKey(m.pda),
              side,
              amountBase,
              owner: wallet!.publicKey,
            });
            const tx = new Transaction().add(ix);
            setSig(await provider.sendAndConfirm(tx));
            // pools/position/balance all changed on-chain — refetch so the UI doesn't show pre-stake numbers
            await Promise.all(
              [["markets"], ["position"], ["balances"]].map((k) =>
                queryClient.invalidateQueries({ queryKey: k })
              )
            );
          } catch (e) {
            setTxErr(e instanceof Error ? e.message : "Transaction failed");
          } finally {
            setBusy(false);
          }
        }}
        className="w-full whitespace-normal leading-snug"
      >
        {err ?? (busy ? "Confirming…" : `Stake ${usdc} USDC`)}
      </Button>
      {txErr && <p className="break-words text-xs text-red-400">{txErr}</p>}
      {sig && (
        <a className="break-all text-xs text-emerald-400" href={explorerTx(sig)}>
          View tx →
        </a>
      )}
    </div>
  );
}
