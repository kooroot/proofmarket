// @vitest-environment node
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const connection = vi.hoisted(() => ({
  getBalance: vi.fn(),
}));

const sendAndConfirmTransactionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/connection", () => ({
  getConnection: () => connection,
}));

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    sendAndConfirmTransaction: sendAndConfirmTransactionMock,
  };
});

const makeRequest = (pubkey: string) =>
  new Request("http://localhost/api/faucet/sol", {
    method: "POST",
    body: JSON.stringify({ pubkey }),
  }) as NextRequest;

describe("POST /api/faucet/sol", () => {
  beforeEach(() => {
    vi.resetModules();
    connection.getBalance.mockReset();
    sendAndConfirmTransactionMock.mockReset();
    sendAndConfirmTransactionMock.mockResolvedValue("SOL_SIG");
    process.env.FAUCET_AUTHORITY_SECRET = bs58.encode(Keypair.generate().secretKey);
    process.env.NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_RPC_URL = "https://api.devnet.solana.com";
  });

  it("rejects an invalid pubkey", async () => {
    const { POST } = await import("./route");

    const res = await POST(makeRequest("not-a-key"));

    expect(res.status).toBe(400);
    expect(sendAndConfirmTransactionMock).not.toHaveBeenCalled();
  });

  it("grants a small devnet SOL balance to a low-balance wallet", async () => {
    const owner = Keypair.generate().publicKey;
    connection.getBalance.mockResolvedValue(0);
    const { POST } = await import("./route");

    const res = await POST(makeRequest(owner.toBase58()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.solGranted).toBe(true);
    expect(body.sig).toBe("SOL_SIG");
    expect(sendAndConfirmTransactionMock).toHaveBeenCalledOnce();
  });

  it("skips the transfer when the wallet already has gas", async () => {
    const owner = Keypair.generate().publicKey;
    connection.getBalance.mockResolvedValue(100_000_000);
    const { POST } = await import("./route");

    const res = await POST(makeRequest(owner.toBase58()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.solGranted).toBe(false);
    expect(sendAndConfirmTransactionMock).not.toHaveBeenCalled();
  });

  it("does not throttle refreshes after the wallet already has gas", async () => {
    const owner = Keypair.generate().publicKey;
    connection.getBalance.mockResolvedValueOnce(0).mockResolvedValueOnce(100_000_000);
    const { POST } = await import("./route");

    const first = await POST(makeRequest(owner.toBase58()));
    const second = await POST(makeRequest(owner.toBase58()));
    const body = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(body.solGranted).toBe(false);
    expect(sendAndConfirmTransactionMock).toHaveBeenCalledOnce();
  });
});
