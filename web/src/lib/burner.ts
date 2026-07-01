import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
const KEY = "proofmarket.burner.sk";
// In the browser we use window.localStorage; under SSR/node (no window) we fall back to an
// in-memory store persisted for the process lifetime. Typed as a subset of Storage — no `any`.
type MiniStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
let memStore: MiniStore | undefined;
const makeMemStore = (): MiniStore => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const store = (): MiniStore => (typeof window !== "undefined" ? window.localStorage : (memStore ??= makeMemStore()));
export function getBurner(): Keypair | null {
  // bs58.decode() returns a Buffer; Keypair.fromSecretKey wants a Uint8Array. Re-wrap so
  // @noble/curves' isBytes (instanceof Uint8Array) passes in every realm (Buffer fails it under jsdom).
  const sk = store().getItem(KEY); return sk ? Keypair.fromSecretKey(Uint8Array.from(bs58.decode(sk))) : null;
}
export function loadOrCreateBurner(): Keypair {
  const existing = getBurner(); if (existing) return existing;
  const kp = Keypair.generate(); store().setItem(KEY, bs58.encode(kp.secretKey)); return kp;
}
export function clearBurner() { store().removeItem(KEY); }
