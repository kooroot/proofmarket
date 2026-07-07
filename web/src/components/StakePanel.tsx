"use client";
import { useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { PlayAsGuestButton } from "@/components/PlayAsGuestButton";
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
  const preview = payoutForStake(amountBase, side, m.yesPool, m.noPool, m.feeBps);

  const sideBtn = (active: boolean) =>
    active
      ? "rounded-[3px] bg-proof py-[10px] font-mono text-[13px] font-semibold text-paper"
      : "rounded-[3px] border border-rule-2 py-[10px] font-mono text-[13px] text-ink-2 transition-colors hover:text-ink";

  return (
    <div className="rounded-[4px] border border-rule-2 p-5">
      <div className="mb-[14px] font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">Stake</div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSide(true)} aria-pressed={side} className={sideBtn(side)}>
          YES
        </button>
        <button type="button" onClick={() => setSide(false)} aria-pressed={!side} className={sideBtn(!side)}>
          NO
        </button>
      </div>

      <div className="mb-3 flex items-center rounded-[3px] border border-rule-2 px-[14px]">
        <input
          value={usdc}
          onChange={(e) => setUsdc(e.target.value)}
          inputMode="decimal"
          placeholder="USDC"
          aria-label="Stake amount in USDC"
          className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[16px] text-ink outline-none placeholder:text-ink-2"
        />
        <span className="font-mono text-[12px] text-ink-2">USDC</span>
      </div>

      <p className="mb-[14px] break-words text-[13.5px] text-ink-2">
        {preview !== null
          ? `if ${side ? "YES" : "NO"}, you claim ≈ ${formatUsdc(preview)} USDC`
          : "one-sided pool — would Void & refund"}
      </p>

      {!wallet && (
        <div className="mb-3 rounded-[3px] border border-proof bg-proof-soft p-3">
          <div className="mb-2 text-[13px] font-semibold text-proof">No wallet setup needed.</div>
          <p className="mb-3 text-[12.5px] leading-[1.5] text-ink-2">
            Start with a temporary devnet burner wallet, then use the faucet and place a test stake.
          </p>
          <PlayAsGuestButton className="w-full justify-center" />
        </div>
      )}

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
        className="h-auto w-full whitespace-normal rounded-[3px] bg-proof py-[13px] font-mono text-[14px] font-semibold leading-snug text-paper hover:brightness-110"
      >
        {err ?? (busy ? "Confirming…" : `Stake ${usdc} USDC`)}
      </Button>

      {txErr && <p className="mt-2 break-words text-[12px] text-revert">{txErr}</p>}
      {sig && (
        <a className="mt-2 block break-all font-mono text-[12px] text-proof underline" href={explorerTx(sig)}>
          View tx →
        </a>
      )}
    </div>
  );
}
