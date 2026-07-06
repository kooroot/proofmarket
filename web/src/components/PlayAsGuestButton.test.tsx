import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => walletState,
}));

describe("PlayAsGuestButton", () => {
  beforeEach(() => {
    walletState.publicKey = null;
    walletState.wallet = null;
    walletState.connecting = false;
    walletState.select.mockReset();
    walletState.connect.mockReset();
    walletState.connect.mockResolvedValue(undefined);
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

  it("shows the connected burner public key when selected", () => {
    walletState.wallet = { adapter: { name: BurnerWalletName } };
    walletState.publicKey = {
      toBase58: () => "Burner111111111111111111111111111111111",
    };

    render(<PlayAsGuestButton />);

    expect(screen.getByRole("button", { name: /Burner Burn.*1111/i })).toBeTruthy();
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
