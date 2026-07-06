"use client";
import { Button } from "@/components/ui/button";
import { BurnerWalletName } from "@/lib/burner-wallet-adapter";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
export function PlayAsGuestButton() {
  const { publicKey, select, connect, wallet, connecting } = useWallet();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const isBurner = wallet?.adapter.name === BurnerWalletName;
  const pk = isBurner ? publicKey?.toBase58() ?? null : null;

  useEffect(() => {
    if (!busy || !isBurner || publicKey || connecting) return;
    void connect()
      .then(() => setFailed(false))
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }, [busy, connect, connecting, isBurner, publicKey]);

  return (
    <Button
      variant={failed ? "destructive" : "secondary"}
      disabled={busy || connecting}
      onClick={async () => {
        setFailed(false);
        setBusy(true);
        select(BurnerWalletName);
      }}
    >
      {pk
        ? `Burner ${pk.slice(0, 4)}...${pk.slice(-4)}`
        : failed
        ? "Guest failed"
        : busy || connecting
        ? "Connecting..."
        : "Play as guest"}
    </Button>
  );
}
