# ProofMarket — ≤5:00 Demo Script & Shot-List

> The video carries the product (matches may be over during judging). Total runtime budget: 5:00.

> **Recording note — the deploy is LIVE.** Record every beat on the production URL **https://proofmarket-tan.vercel.app** (devnet): Phantom stake, faucet, Explorer permalinks, and the animated resolution walk at `/replay/18172280` all work there today. The **hero** (resolution + Proof Receipt) additionally reproduces hermetically with `yarn e2e-replay` (in-process SVM, no validator/SOL) — use that terminal receipt as the beat-5 close-up, since the live demo market stays OPEN by design (see README "Why the live market is OPEN, not Resolved").

## 0:00–0:30 — Hook (trust model)
- On screen: "Polymarket/UMA resolves by people voting — reveal windows, disputes. Watch a market resolve by math."
- Cut to the UMA/ProofMarket contrast card (amber vs green).

## 0:30–1:30 — List + Detail
- Scroll the Market List; pause on a priced market's twin bar ("crowd 61% vs TxLINE fair value 55% — the edge").
- Open the flagship monotone-goals market; connect Phantom (devnet); stake 50 test-USDC; show tx confirm + Explorer link.

## 1:30–2:00 — Funding once
- Click "Get 1,000 test USDC" (faucet) — establish: free + reproducible on devnet.

## 2:00–4:00 — THE HERO (~40% of runtime, by design)
- Trigger settlement via Replay (the captured real `resolve` tx / `yarn e2e-replay`).
- Reveal the six ProofStep cards in order:
  1. leaf `{key:1, value:1, period:7}`
  2. eventStatRoot
  3. fixture subtree
  4. daily-root PDA `BcLwqHJehs8ut8ycRo6NhCGsrtmRnkZbFMm273SdcPGe` (click -> Explorer, EXISTS)
  5. escrow CPI -> `validate_stat` -> inner `Program return: 6pW64g…wyP2J AQ==` (0x01 = TRUE) (click -> Explorer inner instructions)
  6. per-winner `claim`, USDC lands in the SAME burner (click -> Explorer transfer)
- Narration foregrounds the nesting: "Our escrow called `validate_stat` as an inner instruction, read `true`, and that bool released the money. No vote. No dispute window. Just math."

## 4:00–4:45 — Side-by-side payoff
- Green chain + amber UMA card together. Surface "resolved in N seconds, 0 disputes, 0 voters, 1 proof verified" (from the Proof Receipt).
- Restate the three hooks: it works = Core Functionality; this is the UX = UX & Use Case; the CPI = Code Quality & Logic.

## 4:45–5:00 — Close
- Deployed devnet URL on screen — **https://proofmarket-tan.vercel.app** — "test it yourself, free." Repo link `github.com/kooroot/proofmarket`. (Hermetic fallback: `yarn e2e-replay` reproduces the resolution offline.)

## Shot capture checklist
- [ ] Explorer tab pre-opened on the **standalone devnet `validate_stat` tx** [`3PwENbNm…`](https://explorer.solana.com/tx/3PwENbNmQBESsnzYWrrcEwGvqfug4ZWmHZeMr7PBRJxtoGUNbyoPPiG6VeDjxGGCA2ZQmNNpUysx2mLiYUMypTMy?cluster=devnet) — the golden proof validated by the REAL txoracle, `Program return: … AQ==` visible in the log.
- [ ] The `yarn e2e-replay` terminal receipt for the resolve/claim close-up (the live demo market is OPEN by design — no on-devnet resolve tx exists to permalink; the replay prints the real CPI receipt deterministically).
- [ ] Burner wallet that staked == burner that receives the claim (same address visible in both Explorer links).
- [ ] Faucet mints 1,000 test-USDC live (no purchase, no devnet SOL needed to view data).
