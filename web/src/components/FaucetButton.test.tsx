import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FaucetButton } from "./FaucetButton";

const queryClient = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClient,
}));

describe("FaucetButton", () => {
  beforeEach(() => {
    queryClient.invalidateQueries.mockReset();
    vi.unstubAllGlobals();
  });

  it("is disabled until a wallet public key exists", () => {
    render(<FaucetButton pubkey={undefined} />);

    const button = screen.getByRole("button", { name: /get 1,000 test usdc/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("mints test USDC and refreshes the connected wallet balance", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<FaucetButton pubkey="Burner111" />);

    fireEvent.click(screen.getByRole("button", { name: /get 1,000 test usdc/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/faucet/usdc",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pubkey: "Burner111" }),
      })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["balances", "Burner111"],
    });
    expect(screen.getByRole("button", { name: /funded/i })).toBeTruthy();
  });

  it("shows a failure state when the faucet API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );

    render(<FaucetButton pubkey="Burner111" />);

    fireEvent.click(screen.getByRole("button", { name: /get 1,000 test usdc/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /faucet failed/i })).toBeTruthy()
    );
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
