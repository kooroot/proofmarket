"use client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function FaucetButton({ pubkey }: { pubkey: string | undefined }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "funded" | "error">("idle");

  const label =
    status === "funded"
      ? "Funded"
      : status === "error"
      ? "Faucet failed"
      : busy
      ? "Minting..."
      : "Get 1,000 test USDC";

  return (
    <Button
      disabled={!pubkey || busy}
      variant={status === "error" ? "destructive" : "default"}
      onClick={async () => {
        if (!pubkey) return;
        setBusy(true);
        setStatus("idle");
        try {
          const response = await fetch("/api/faucet/usdc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pubkey }),
          });
          if (!response.ok) throw new Error(`Faucet failed: ${response.status}`);
          await queryClient.invalidateQueries({ queryKey: ["balances", pubkey] });
          setStatus("funded");
        } catch {
          setStatus("error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
