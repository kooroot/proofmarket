"use client";
import { Toggle } from "@/components/ui/toggle";
import { useState } from "react";
import { foldToRoot } from "@/lib/fold";
import type { AnchorBundle } from "@/lib/proof";
export function VerifyToggle({ bundle, enabled }: { bundle: AnchorBundle; enabled: boolean }) {
  const [on, setOn] = useState(false);
  if (!enabled)
    return (
      <p className="font-mono text-[11px] text-ink-2">
        Fold shown as schematic (illustrative) — on-chain validate_stat is the authoritative proof.
      </p>
    );
  const leaf = Uint8Array.from([bundle.statToProve.key, bundle.statToProve.value, bundle.statToProve.period]); // serialization per Phase-0 finding
  const recomputed = on ? Buffer.from(foldToRoot(leaf, bundle.statProof, "keccak256")).toString("hex").slice(0, 12) : "";
  const target = Buffer.from(Uint8Array.from(bundle.eventStatRoot)).toString("hex").slice(0, 12);
  return (
    <div className="font-mono text-[11px]">
      <Toggle pressed={on} onPressedChange={setOn}>Verify in your browser</Toggle>
      {on && (
        <span className={recomputed === target ? "text-proof" : "text-revert"}>
          {" "}
          recomputed {recomputed}… vs root {target}…
        </span>
      )}
    </div>
  );
}
