import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID: "6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb",
      NEXT_PUBLIC_USDC_MINT: "2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT",
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
