import { describe, it, expect, beforeEach } from "vitest";
import { loadOrCreateBurner, getBurner, clearBurner } from "./burner";
describe("burner", () => {
  beforeEach(() => clearBurner());
  it("persists the same keypair across loads", () => {
    const a = loadOrCreateBurner(); const b = loadOrCreateBurner();
    expect(a.publicKey.toBase58()).toBe(b.publicKey.toBase58());
    expect(getBurner()!.publicKey.toBase58()).toBe(a.publicKey.toBase58());
  });
});
