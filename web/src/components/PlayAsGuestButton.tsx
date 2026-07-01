"use client";
import { Button } from "@/components/ui/button";
import { loadOrCreateBurner } from "@/lib/burner";
import { useState } from "react";
export function PlayAsGuestButton() {
  const [pk, setPk] = useState<string | null>(null);
  return (
    <Button variant="secondary" onClick={() => setPk(loadOrCreateBurner().publicKey.toBase58())}>
      {pk ? `Burner ${pk.slice(0,4)}…${pk.slice(-4)}` : "▶ Play as guest"}
    </Button>
  );
}
