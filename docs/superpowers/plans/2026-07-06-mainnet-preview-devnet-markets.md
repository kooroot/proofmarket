# Mainnet Preview And Devnet Markets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show ProofMarket as both an executable devnet settlement demo and a broader TxLINE mainnet World Cup data product.

**Architecture:** Keep settlement execution on the existing devnet ProofMarket program while adding a server-only TxLINE mainnet fixture preview. Seed multiple devnet markets for the known devnet fixture so the executable path no longer looks like a single-card toy, and label mainnet data preview separately from devnet settlement.

**Tech Stack:** Solana Anchor, TxLINE API, Next.js App Router, React Query, Vitest, Vercel.

---

### Task 1: Seed Multiple Executable Devnet Markets

**Files:**
- Modify: `scripts/seed.ts`
- Test: existing Anchor/offchain tests and manual script dry-run review

- [ ] **Step 1: Replace single-market seed constants with a market definition array**

Use market ids `1..4` for:
- `P1 goals > 0`
- `P1 goals + P2 goals > 2`
- `P1 goals - P2 goals > 0`
- `P1 corners - P2 corners > 0`

- [ ] **Step 2: Seed each market idempotently enough for operator reruns**

Before `createMarket`, fetch the market PDA. If it exists, skip creation and continue with state verification. This keeps the script usable after market 1 already exists.

- [ ] **Step 3: Stake starter liquidity per market**

Only seed positions for newly-created markets. Keep the current 60/40 split so every card has YES and NO pool liquidity.

- [ ] **Step 4: Verify**

Run:

```bash
npm run typecheck --prefix web
npm test --prefix web
```

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat(seed): create multiple devnet demo markets"
```

### Task 2: Add Server-Only Mainnet Fixture Preview

**Files:**
- Create: `web/src/app/api/txline/fixtures/snapshot/route.ts`
- Create: `web/src/app/api/txline/fixtures/snapshot/route.test.ts`
- Create: `web/src/lib/mainnet-preview.ts`
- Create: `web/src/lib/mainnet-preview.test.ts`

- [ ] **Step 1: Write tests for fixture normalization**

Test that raw TxLINE fixture rows become a small safe UI model with fixture id, teams, competition, start time, and derived preview market titles.

- [ ] **Step 2: Implement `mainnet-preview.ts`**

Export `buildMainnetFixturePreview(fixtures)` and keep it deterministic. Do not expose JWT or API token.

- [ ] **Step 3: Write route test**

Mock `txlineFetch` and assert the route returns fixture count plus normalized preview rows.

- [ ] **Step 4: Implement route**

Use an explicit mainnet request path. Return a compact JSON payload and fail closed with a 503 when credentials are missing or the upstream call fails.

- [ ] **Step 5: Verify**

Run:

```bash
npm test --prefix web -- mainnet-preview route
npm run typecheck --prefix web
```

- [ ] **Step 6: Commit**

```bash
git add web/src/app/api/txline/fixtures/snapshot web/src/lib/mainnet-preview.ts web/src/lib/mainnet-preview.test.ts
git commit -m "feat(web): add txline mainnet fixture preview api"
```

### Task 3: Upgrade Home Page Positioning

**Files:**
- Modify: `web/src/app/page.tsx`
- Create: `web/src/hooks/useMainnetFixturePreview.ts`
- Create: `web/src/components/MainnetFixturePreview.tsx`
- Create: `web/src/components/MainnetFixturePreview.test.tsx`
- Modify: `web/src/components/MarketCard.tsx`

- [ ] **Step 1: Write component tests**

Assert the page labels mainnet preview separately from executable devnet settlement and renders multiple preview fixture cards.

- [ ] **Step 2: Implement preview hook and component**

Use React Query against `/api/txline/fixtures/snapshot`. Render a compact, mobile-first preview with fixture count, network label, free tier badges, and market predicate chips.

- [ ] **Step 3: Update home page layout**

Top section: product positioning and mainnet data preview. Second section: executable devnet settlement markets from `useMarkets`.

- [ ] **Step 4: Verify**

Run:

```bash
npm test --prefix web -- MainnetFixturePreview page
npm run typecheck --prefix web
npm run build --prefix web
```

- [ ] **Step 5: Commit**

```bash
git add web/src/app/page.tsx web/src/hooks/useMainnetFixturePreview.ts web/src/components/MainnetFixturePreview.tsx web/src/components/MainnetFixturePreview.test.tsx web/src/components/MarketCard.tsx
git commit -m "feat(web): showcase mainnet data beside devnet settlement"
```

### Task 4: Deploy And Verify

**Files:**
- Modify docs only if deployment notes need correction.

- [ ] **Step 1: Ensure Vercel production env has server-only TxLINE credentials**

Use the existing activated mainnet `TXLINE_JWT` and `TXLINE_API_TOKEN` from the temporary env file. Do not commit the values.

- [ ] **Step 2: Deploy production**

Run from `web`:

```bash
HOME=/private/tmp/proofmarket-cli-home VERCEL_NO_TELEMETRY=1 npm_config_cache=/private/tmp/proofmarket-npm-cache npx vercel deploy --prod --yes
```

- [ ] **Step 3: Verify deployed site**

Check:
- `/` returns 200 and shows mainnet preview copy
- `/api/txline/fixtures/snapshot` returns `count >= 2`
- existing market route still renders

- [ ] **Step 4: Push**

```bash
git push origin main
```
