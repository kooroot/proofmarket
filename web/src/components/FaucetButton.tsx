"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
export function FaucetButton({ pubkey }: { pubkey: string | undefined }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button disabled={!pubkey || busy} onClick={async () => {
      setBusy(true); try { await fetch("/api/faucet/usdc", { method: "POST", body: JSON.stringify({ pubkey }) }); } finally { setBusy(false); }
    }}>{busy ? "Minting…" : "Get 1,000 test USDC"}</Button>
  );
}
