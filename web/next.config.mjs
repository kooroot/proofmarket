/** @type {import('next').NextConfig} */
// Public devnet defaults, committed here (not in a .env — the repo root .gitignore ignores all
// .env/.env.* except *.example templates). Next loads .env files before evaluating this config, so
// `process.env.X ?? default` lets a real deployment override via env / .env.local while giving
// `next build` (local + CI) the client config the STRICT src/lib/constants.ts requires at import.
const nextConfig = {
  env: {
    NEXT_PUBLIC_RPC_URL:
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK:
      process.env.NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK ?? "devnet",
    NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID:
      process.env.NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID ??
      "6QNd5mHvV7czVkrRNdLPmuUybSwwdPWq9RYuwk5LZuEb",
    NEXT_PUBLIC_USDC_MINT:
      process.env.NEXT_PUBLIC_USDC_MINT ??
      "2MYAvDHmZCnWUC4rMVYstLNniiXHuxo2Z7j7czaHA8LT",
  },
};

export default nextConfig;
