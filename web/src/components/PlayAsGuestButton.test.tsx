import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BurnerWalletName } from "@/lib/burner-wallet-adapter";
import { PlayAsGuestButton } from "./PlayAsGuestButton";

const walletState = vi.hoisted(() => ({
  publicKey: null as { toBase58: () => string } | null,
  wallet: null as { adapter: { name: string } } | null,
  connecting: false,
  select: vi.fn(),
  connect: vi.fn(),
}));

const queryClient = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => walletState,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClient,
}));

describe("PlayAsGuestButton", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    walletState.publicKey = null;
    walletState.wallet = null;
    walletState.connecting = false;
    walletState.select.mockReset();
    walletState.connect.mockReset();
    walletState.connect.mockResolvedValue(undefined);
    queryClient.invalidateQueries.mockReset();
  });

  it("selects the burner wallet adapter", () => {
    render(<PlayAsGuestButton />);

    fireEvent.click(screen.getByRole("button", { name: /play as guest/i }));

    expect(walletState.select).toHaveBeenCalledWith(BurnerWalletName);
  });

  it("connects once the burner wallet is selected", async () => {
    const view = render(<PlayAsGuestButton />);

    fireEvent.click(screen.getByRole("button", { name: /play as guest/i }));
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    view.rerender(<PlayAsGuestButton />);

    await waitFor(() => expect(walletState.connect).toHaveBeenCalled());
  });

  it("defers burner connect until after provider listener effects can mount", async () => {
    vi.useFakeTimers();
    const view = render(<PlayAsGuestButton />);

    fireEvent.click(screen.getByRole("button", { name: /play as guest/i }));
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    view.rerender(<PlayAsGuestButton />);

    expect(walletState.connect).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(walletState.connect).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("shows the connected burner public key when selected", async () => {
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    walletState.publicKey = {
      toBase58: () => "Burner111111111111111111111111111111111",
    };

    render(<PlayAsGuestButton />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Burner Burn.*1111/i })).toBeTruthy()
    );
  });

  it("requests a devnet SOL gas grant when the burner connects", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    walletState.publicKey = {
      toBase58: () => "Burner111111111111111111111111111111111",
    };

    render(<PlayAsGuestButton />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/faucet/sol",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          pubkey: "Burner111111111111111111111111111111111",
        }),
      })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["balances", "Burner111111111111111111111111111111111"],
    });
  });

  it("shows a failure state when burner connection fails", async () => {
    walletState.connect.mockRejectedValue(new Error("rejected"));
    const view = render(<PlayAsGuestButton />);

    fireEvent.click(screen.getByRole("button", { name: /play as guest/i }));
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    view.rerender(<PlayAsGuestButton />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /guest failed/i })).toBeTruthy()
    );
  });
});
