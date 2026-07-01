import { describe, it, expect } from "vitest";
import { resolveSource } from "./useMarketFeed";
describe("useMarketFeed source switch", () => {
  it("live mode reads on-chain + proxy", () => { expect(resolveSource("live").proof).toBe("proxy"); });
  it("replay mode reads the committed golden JSON", () => { expect(resolveSource("replay").proof).toBe("golden"); });
});
