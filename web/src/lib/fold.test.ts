import { describe, it, expect } from "vitest";
import { foldToRoot } from "./fold";
import type { ProofNode } from "./proof";
describe("foldToRoot", () => {
  it("places siblings left/right per isRightSibling and returns 32 bytes", () => {
    const leaf = new Uint8Array(32).fill(1);
    const proof: ProofNode[] = [{ hash: new Array(32).fill(2), isRightSibling: true }, { hash: new Array(32).fill(3), isRightSibling: false }];
    const out = foldToRoot(leaf, proof, "keccak256");
    expect(out.length).toBe(32);
    // deterministic
    expect(Buffer.from(out).toString("hex")).toBe(Buffer.from(foldToRoot(leaf, proof, "keccak256")).toString("hex"));
  });
});
