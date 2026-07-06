"use client";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { getProgram } from "@/lib/program";
import { toUiMarket, type RawMarket, type UiMarket } from "@/lib/market";

// Markets are public data — reads never sign. This typed stub replaces the plan's `{} as any` fallback so a visitor
// with no connected wallet can still browse markets. Typed via structural compatibility with anchor's Wallet interface
// (payer is optional); explicit `: Wallet` annotation omitted because the exported Wallet class extends NodeWallet
// where payer is required, while the Wallet interface (provider.d.ts) accepts it as optional.
const READONLY_WALLET = {
  publicKey: PublicKey.default,
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T) { return tx; },
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]) { return txs; },
};

export function useMarkets() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useQuery<UiMarket[]>({
    queryKey: ["markets"],
    queryFn: async () => {
      const provider = new AnchorProvider(connection, wallet ?? READONLY_WALLET, {});
      const program = getProgram(provider);
      const all = await program.account.market.all();
      return all.map((a) => {
        const acc = a.account;
        const raw: RawMarket = {
          marketId: BigInt(acc.marketId.toString()),
          fixtureId: BigInt(acc.fixtureId.toString()),
          statAKey: acc.statAKey,
          statAPeriod: acc.statAPeriod,
          statBKey: acc.statBKey ?? null,
          statBPeriod: acc.statBPeriod ?? null,
          op: acc.op ?? null,
          threshold: acc.threshold,
          comparison: acc.comparison,
          yesPool: BigInt(acc.yesPool.toString()),
          noPool: BigInt(acc.noPool.toString()),
          feeBps: acc.feeBps,
          resolveAfterTs: BigInt(acc.resolveAfterTs.toString()),
          state: acc.state,
          outcome: acc.outcome,
        };
        return toUiMarket(a.publicKey.toBase58(), raw);
      });
    },
  });
}
