"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { FaucetButton } from "@/components/FaucetButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBalances } from "@/hooks/useBalances";
import { getTxlineSettlementNetworkConfig } from "@/lib/txline-network";
import { MAINNET_HISTORICAL_REPLAY_ROUTE } from "@/lib/replay-demo";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

const NAV: { label: string; href: string; match: (p: string) => boolean }[] = [
  { label: "Index", href: "/", match: (p) => p === "/" },
  { label: "Market", href: "/#the-book", match: (p) => p.startsWith("/m/") },
  { label: "Replay", href: MAINNET_HISTORICAL_REPLAY_ROUTE, match: (p) => p.startsWith("/replay") },
  { label: "Portfolio", href: "/portfolio", match: (p) => p.startsWith("/portfolio") },
];

export function Masthead() {
  const pathname = usePathname() || "/";
  const { publicKey } = useWallet();
  const pk = publicKey?.toBase58();
  const bal = useBalances(pk);
  const settlementNetwork = getTxlineSettlementNetworkConfig().network;
  const wrongNet =
    settlementNetwork === "devnet" && (process.env.NEXT_PUBLIC_RPC_URL ?? "").includes("mainnet");

  return (
    <header>
      {wrongNet && (
        <div className="bg-revert py-1 text-center font-mono text-xs text-paper">Switch to Devnet</div>
      )}

      {/* dateline */}
      <div className="border-b border-rule font-mono text-[11px] tracking-[0.04em] text-ink-2">
        <div className="mx-auto flex max-w-[1160px] justify-between gap-4 px-7 py-[7px]">
          <span>PROOFMARKET · SETTLEMENT LEDGER</span>
          <span className="flex flex-wrap gap-x-[18px]">
            <span>SOLANA / DEVNET</span>
            <span>EPOCH 20641</span>
            <span className="text-ink">{pathname}</span>
          </span>
        </div>
      </div>

      {/* masthead */}
      <div className="mx-auto max-w-[1160px] px-7 pt-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-5 pb-[18px]">
          <Link href="/" className="flex items-center gap-[14px]">
            <svg width="42" height="42" viewBox="0 0 100 100" className="block flex-none" role="img" aria-label="ProofMarket">
              <defs>
                <linearGradient id="pm-lgm" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#3de6ad" />
                  <stop offset=".55" stopColor="#22c58c" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="23.5" fill="url(#pm-lgm)" />
              <path d="M38 24 L38 84" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
              <path d="M38 24 C74 24 74 58.5 38 58.5" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="38" cy="24" r="5" fill="#fff" />
              <circle cx="38" cy="84" r="8.2" fill="#04371f" />
              <circle cx="38" cy="84" r="8.2" fill="none" stroke="#fff" strokeWidth="3" />
            </svg>
            <div>
              <div className="font-display text-[29px] font-bold leading-none tracking-[-0.03em]">ProofMarket</div>
              <div className="mt-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-2">
                No vote · No dispute window · Just math
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-[10px]">
            <span className="inline-flex items-center gap-[7px] rounded-[3px] border border-rule px-[11px] py-[7px] font-mono text-[11px] text-ink-2">
              <span className="h-[6px] w-[6px] rounded-full bg-proof" style={{ animation: "blink 2.4s infinite" }} />
              DEVNET
            </span>
            {pk && (
              <span className="hidden font-mono text-[11px] tabular-nums text-ink-2 sm:inline">
                {bal.data?.sol ?? "—"} SOL · ${bal.data?.usdc ?? "—"}
              </span>
            )}
            <FaucetButton pubkey={pk} />
            <ThemeToggle />
            <div className="min-w-0 max-w-full [&_.wallet-adapter-button]:h-9 [&_.wallet-adapter-button]:max-w-full [&_.wallet-adapter-button]:truncate [&_.wallet-adapter-button]:rounded-[3px] [&_.wallet-adapter-button]:bg-ink [&_.wallet-adapter-button]:px-3 [&_.wallet-adapter-button]:font-mono [&_.wallet-adapter-button]:text-[11.5px] [&_.wallet-adapter-button]:text-paper">
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className="flex gap-[2px] border-t-2 border-ink border-b border-b-rule">
          {NAV.map((item) => {
            const on = item.match(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`-mb-px px-[15px] py-[11px] font-mono text-[12.5px] tracking-[0.04em] transition-colors ${
                  on
                    ? "border-b-2 border-proof font-semibold text-ink"
                    : "border-b-2 border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
