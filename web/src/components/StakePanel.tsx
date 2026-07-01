"use client";
import { useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getProgram } from "@/lib/program";
import { buildStakeIx, validateStakeAmount } from "@/lib/tx-stake";
import { payoutForStake, formatUsdc } from "@/lib/parimutuel";
import type { UiMarket } from "@/lib/market";
export function StakePanel({ m }: { m: UiMarket }) {
  const { connection } = useConnection(); const wallet = useAnchorWallet();
  const [side, setSide] = useState(true); const [usdc, setUsdc] = useState("50"); const [sig, setSig] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const amountBase = BigInt(Math.round((parseFloat(usdc || "0")) * 1e6));
  const err = validateStakeAmount(amountBase);
  const preview = payoutForStake(amountBase, side, m.yesPool, m.noPool, m.feeBps);
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <ToggleGroup value={side ? ["yes"] : ["no"]} onValueChange={(v) => { if (v.length > 0) setSide(v[v.length - 1] === "yes"); }}>
        <ToggleGroupItem value="yes">YES</ToggleGroupItem><ToggleGroupItem value="no">NO</ToggleGroupItem>
      </ToggleGroup>
      <Input value={usdc} onChange={(e) => setUsdc(e.target.value)} placeholder="USDC" />
      <p className="text-sm text-zinc-400">{preview !== null ? `if ${side ? "YES" : "NO"}, you claim ≈ ${formatUsdc(preview)} USDC` : "one-sided pool — would Void & refund"}</p>
      <Button disabled={!wallet || !!err || busy} onClick={async () => {
        setTxErr(null); setBusy(true);
        try {
          const provider = new AnchorProvider(connection, wallet!, {}); const program = getProgram(provider);
          const ix = await buildStakeIx(program, { market: new PublicKey(m.pda), side, amountBase, owner: wallet!.publicKey });
          const tx = new Transaction().add(ix); setSig(await provider.sendAndConfirm(tx));
        } catch (e) {
          setTxErr(e instanceof Error ? e.message : "Transaction failed");
        } finally {
          setBusy(false);
        }
      }}>{err ?? (busy ? "Confirming…" : `Stake ${usdc} USDC`)}</Button>
      {txErr && <p className="text-xs text-red-400">{txErr}</p>}
      {sig && <a className="text-xs text-emerald-400" href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}>View tx →</a>}
    </div>
  );
}
