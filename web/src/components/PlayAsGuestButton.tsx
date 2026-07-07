"use client";
import { Button } from "@/components/ui/button";
import { BurnerWalletName } from "@/lib/burner-wallet-adapter";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
export function PlayAsGuestButton() {
  const { publicKey, select, connect, wallet, connecting } = useWallet();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gasStatus, setGasStatus] = useState<"idle" | "funding" | "error">("idle");
  const fundedPubkey = useRef<string | null>(null);
  const isBurner = wallet?.adapter.name === BurnerWalletName;
  const pk = isBurner ? publicKey?.toBase58() ?? null : null;

  useEffect(() => {
    if (!busy || !isBurner || publicKey || connecting) return;
    const timer = window.setTimeout(() => {
      void connect()
        .then(() => setFailed(false))
        .catch(() => setFailed(true))
        .finally(() => setBusy(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [busy, connect, connecting, isBurner, publicKey]);

  useEffect(() => {
    if (!pk || !isBurner || fundedPubkey.current === pk) return;
    setBusy(false);
    setFailed(false);
    fundedPubkey.current = pk;
    setGasStatus("funding");
    void fetch("/api/faucet/sol", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey: pk }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`SOL faucet failed: ${response.status}`);
        setGasStatus("idle");
        return queryClient.invalidateQueries({ queryKey: ["balances", pk] });
      })
      .catch(() => setGasStatus("error"));
  }, [isBurner, pk, queryClient]);

  const isError = failed || gasStatus === "error";
  return (
    <Button
      variant={isError ? "destructive" : "default"}
      disabled={busy || connecting}
      className={`h-auto rounded-[3px] px-5 py-3 font-mono text-[13px] font-semibold hover:brightness-110 ${isError ? "" : "bg-proof text-paper"}`}
      onClick={async () => {
        setFailed(false);
        setGasStatus("idle");
        setBusy(true);
        select(BurnerWalletName);
      }}
    >
      {pk
        ? gasStatus === "funding"
          ? "Funding gas..."
          : gasStatus === "error"
          ? "Gas faucet failed"
          : `Burner ${pk.slice(0, 4)}...${pk.slice(-4)}`
        : failed
        ? "Guest failed"
        : busy || connecting
        ? "Connecting..."
        : "Play as guest"}
    </Button>
  );
}
