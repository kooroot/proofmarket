"use client";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { getConnection } from "@/lib/connection";
import { USDC_MINT } from "@/lib/constants";
import { formatUsdc } from "@/lib/parimutuel";
export function fmtSol(lamports: number): string { return (lamports / 1e9).toFixed(4); }
export function useBalances(pubkey: string | undefined) {
  return useQuery({
    enabled: !!pubkey, queryKey: ["balances", pubkey],
    queryFn: async () => {
      const conn = getConnection(); const owner = new PublicKey(pubkey!);
      const sol = fmtSol(await conn.getBalance(owner));
      let usdc = "0.00";
      try { const acc = await getAccount(conn, getAssociatedTokenAddressSync(USDC_MINT, owner)); usdc = formatUsdc(acc.amount); } catch { /* no USDC ATA yet -> keep zero balance */ }
      return { sol, usdc };
    },
  });
}
