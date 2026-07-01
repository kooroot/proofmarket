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
      <nav className="flex items-center justify-between p-3 max-w-5xl mx-auto">
        <Link href="/" className="font-bold">ProofMarket</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link className="text-emerald-400" href="/replay/18172280">Replay demo</Link>
          <Link href="/portfolio">Portfolio</Link>
          {pk && <span className="text-zinc-400 tabular-nums">{bal.data?.sol ?? "—"} SOL · ${bal.data?.usdc ?? "—"}</span>}
          <FaucetButton pubkey={pk} /><PlayAsGuestButton /><WalletMultiButton />
        </div>
      </nav>
    </header>
  );
}
