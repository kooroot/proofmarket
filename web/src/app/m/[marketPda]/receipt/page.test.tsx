import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Receipt from "./page";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: true }),
}));

vi.mock("@/hooks/useResolveReceipt", () => ({
  useResolveReceipt: () => ({
    data: { validate: { predicateTrue: true, returnBase64: "AQ==", returnBool: true } },
  }),
}));

vi.mock("@/lib/market", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market")>();
  return {
    ...actual,
    dailyRootPda: () => ({ toBase58: () => "BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe" }),
  };
});

describe("Receipt page", () => {
  it("makes clear the receipt is a replay artifact when the live market remains open", () => {
    render(<Receipt params={{ marketPda: "Market1111111111111111111111111111111111" }} />);

    expect(screen.getByText(/Live devnet markets stay open/i)).toBeInTheDocument();
    expect(screen.getByText(/historical golden proof cannot satisfy a future finality guard/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /standalone validate_stat tx/i })).toHaveAttribute(
      "href",
      expect.stringContaining("3PwENbNm"),
    );
  });
});
