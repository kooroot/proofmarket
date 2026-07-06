"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { PlayAsGuestButton } from "./PlayAsGuestButton";
import { FaucetButton } from "./FaucetButton";
import { useBalances } from "@/hooks/useBalances";
import { getTxlineSettlementNetworkConfig } from "@/lib/txline-network";
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);
export function Navbar() {
  const { publicKey } = useWallet();
  const pk = publicKey?.toBase58();
  const bal = useBalances(pk);
  const settlementNetwork = getTxlineSettlementNetworkConfig().network;
  const wrongNet =
    settlementNetwork === "devnet" &&
    (process.env.NEXT_PUBLIC_RPC_URL ?? "").includes("mainnet");
  return (
    <header className="border-b border-zinc-800">
      {wrongNet && (
        <div className="bg-amber-600 text-black text-center text-sm py-1">
          Switch to Devnet
        </div>
      )}
      <nav className="mx-auto flex max-w-5xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <Link href="/" className="font-bold leading-none">
          ProofMarket
        </Link>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:w-auto sm:justify-end">
          <Link
            className="text-emerald-400 whitespace-nowrap"
            href="/replay/18172280"
          >
            Replay demo
          </Link>
          <Link className="whitespace-nowrap" href="/portfolio">
            Portfolio
          </Link>
          {pk && (
            <span className="hidden sm:inline text-zinc-400 tabular-nums whitespace-nowrap">
              {bal.data?.sol ?? "—"} SOL · ${bal.data?.usdc ?? "—"}
            </span>
          )}
          <FaucetButton pubkey={pk} />
          <PlayAsGuestButton />
          <div className="min-w-0 max-w-full [&_.wallet-adapter-button]:h-9 [&_.wallet-adapter-button]:max-w-full [&_.wallet-adapter-button]:truncate [&_.wallet-adapter-button]:px-3 [&_.wallet-adapter-button]:text-xs sm:[&_.wallet-adapter-button]:text-sm">
            <WalletMultiButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
