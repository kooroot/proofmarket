import { test, expect } from "bun:test";
import {
  getTxlineNetworkConfig,
  normalizeTxlineNetwork,
  subscribeConfigForNetwork,
  txlineApiUrl,
  txlineExplorerTx,
} from "../src/ingestion/network.ts";

test("mainnet config matches the TxLINE World Cup free-tier docs", () => {
  const cfg = getTxlineNetworkConfig("mainnet");

  expect(cfg.rpcUrl).toBe("https://api.mainnet-beta.solana.com");
  expect(cfg.apiOrigin).toBe("https://txline.txodds.com");
  expect(cfg.programId).toBe("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
  expect(cfg.txlTokenMint).toBe("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
  expect(cfg.freeServiceLevels.map((s) => s.id)).toEqual([1, 12]);
});

test("subscribe config is generated as a single-network bundle", () => {
  expect(
    subscribeConfigForNetwork("mainnet", {
      serviceLevelId: 12,
      durationWeeks: 4,
    })
  ).toEqual({
    rpcUrl: "https://api.mainnet-beta.solana.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    serviceLevelId: 12,
    durationWeeks: 4,
  });
});

test("network URLs stay host-correct", () => {
  expect(txlineApiUrl("/api/scores/stat-validation", "mainnet")).toBe(
    "https://txline.txodds.com/api/scores/stat-validation"
  );
  expect(txlineExplorerTx("SIG", "devnet")).toBe(
    "https://explorer.solana.com/tx/SIG?cluster=devnet"
  );
});

test("unsupported networks are rejected", () => {
  expect(() => normalizeTxlineNetwork("testnet")).toThrow(/TXLINE_NETWORK/);
});
