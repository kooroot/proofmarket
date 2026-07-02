"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { PlayAsGuestButton } from "./PlayAsGuestButton";
import { FaucetButton } from "./FaucetButton";
import { useBalances } from "@/hooks/useBalances";
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton), { ssr: false });
export function Navbar() {
  const { publicKey } = useWallet(); const pk = publicKey?.toBase58(); const bal = useBalances(pk);
  const wrongNet = (process.env.NEXT_PUBLIC_RPC_URL ?? "").includes("mainnet");
  return (
    <header className="border-b border-zinc-800">
      {wrongNet && <div className="bg-amber-600 text-black text-center text-sm py-1">Switch to Devnet</div>}
      <nav className="flex flex-wrap items-center justify-between gap-y-2 p-3 max-w-5xl mx-auto">
        <Link href="/" className="font-bold">ProofMarket</Link>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm">
          <Link className="text-emerald-400 whitespace-nowrap" href="/replay/18172280">Replay demo</Link>
          <Link className="whitespace-nowrap" href="/portfolio">Portfolio</Link>
          {pk && <span className="hidden sm:inline text-zinc-400 tabular-nums whitespace-nowrap">{bal.data?.sol ?? "—"} SOL · ${bal.data?.usdc ?? "—"}</span>}
          <FaucetButton pubkey={pk} /><PlayAsGuestButton /><WalletMultiButton />
        </div>
      </nav>
    </header>
  );
}
