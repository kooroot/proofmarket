// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  explorerAddrForNetwork,
  explorerTxForNetwork,
  getTxlineNetworkConfig,
  getTxlineSettlementNetworkConfig,
  normalizeTxlineNetwork,
  txlineApiUrl,
} from "./txline-network";

describe("txline network config", () => {
  it("pins official mainnet World Cup free-tier addresses", () => {
    const cfg = getTxlineNetworkConfig("mainnet");

    expect(cfg.rpcUrl).toBe("https://api.mainnet-beta.solana.com");
    expect(cfg.apiOrigin).toBe("https://txline.txodds.com");
    expect(cfg.apiBaseUrl).toBe("https://txline.txodds.com/api");
    expect(cfg.programId.toBase58()).toBe(
      "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"
    );
    expect(cfg.txlTokenMint.toBase58()).toBe(
      "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"
    );
    expect(cfg.freeServiceLevels.map((s) => s.id)).toEqual([1, 12]);
  });

  it("keeps settlement defaults on devnet unless explicitly redeployed", () => {
    expect(getTxlineSettlementNetworkConfig().network).toBe("devnet");
    expect(getTxlineSettlementNetworkConfig().programId.toBase58()).toBe(
      "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"
    );
  });

  it("builds API and explorer URLs without mixing network syntax", () => {
    expect(txlineApiUrl("/api/scores/snapshot/18172280", "mainnet")).toBe(
      "https://txline.txodds.com/api/scores/snapshot/18172280"
    );
    expect(txlineApiUrl("/scores/snapshot/18172280", "devnet")).toBe(
      "https://txline-dev.txodds.com/api/scores/snapshot/18172280"
    );
    expect(explorerTxForNetwork("SIG", "mainnet")).toBe(
      "https://explorer.solana.com/tx/SIG"
    );
    expect(explorerAddrForNetwork("ADDR", "devnet")).toBe(
      "https://explorer.solana.com/address/ADDR?cluster=devnet"
    );
  });

  it("rejects unsupported network names", () => {
    expect(() => normalizeTxlineNetwork("localnet")).toThrow(/TXLINE_NETWORK/);
  });
});
