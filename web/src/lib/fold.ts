import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { ProofNode } from "./proof";
type HashFn = (data: Uint8Array) => Uint8Array;
const H: Record<"keccak256" | "sha256", HashFn> = { keccak256: keccak_256, sha256 };
export function foldToRoot(leaf: Uint8Array, proof: ProofNode[], hashName: keyof typeof H): Uint8Array {
  const h = H[hashName]; let acc = leaf;
  for (const node of proof) {
    const sib = Uint8Array.from(node.hash);
    const pair = node.isRightSibling ? new Uint8Array([...acc, ...sib]) : new Uint8Array([...sib, ...acc]);
    acc = h(pair); // §4.6: resolve the eventStatRoot==subTreeProof[0] anomaly before trusting the order
  }
  return acc;
}
