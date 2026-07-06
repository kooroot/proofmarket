// @vitest-environment node
import { describe, expect, it, beforeEach } from "vitest";
import { Keypair, Transaction } from "@solana/web3.js";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { clearBurner } from "./burner";
import { BurnerWalletAdapter, BurnerWalletName } from "./burner-wallet-adapter";

describe("BurnerWalletAdapter", () => {
  beforeEach(() => clearBurner());

  it("connects a persisted browser burner as a loadable signer wallet", async () => {
    const adapter = new BurnerWalletAdapter();

    expect(adapter.name).toBe(BurnerWalletName);
    expect(adapter.readyState).toBe(WalletReadyState.Loadable);
    expect(adapter.connected).toBe(false);

    await adapter.connect();

    const publicKey = adapter.publicKey;
    expect(publicKey?.toBase58()).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(adapter.connected).toBe(true);

    const nextAdapter = new BurnerWalletAdapter();
    await nextAdapter.connect();
    expect(nextAdapter.publicKey?.toBase58()).toBe(publicKey?.toBase58());
  });

  it("signs legacy transactions with the burner keypair", async () => {
    const adapter = new BurnerWalletAdapter();
    await adapter.connect();
    const publicKey = adapter.publicKey!;

    const tx = new Transaction({
      feePayer: publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
    });

    const signed = await adapter.signTransaction(tx);
    const ownSignature = signed.signatures.find((sig) =>
      sig.publicKey.equals(publicKey)
    );

    expect(ownSignature?.signature).toBeTruthy();
  });
});
