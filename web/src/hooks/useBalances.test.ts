import { describe, it, expect } from "vitest";
import { fmtSol } from "./useBalances";
describe("fmtSol", () => { it("renders lamports as SOL", () => { expect(fmtSol(15_000_000)).toBe("0.0150"); expect(fmtSol(0)).toBe("0.0000"); }); });
