# ProofMarket "Settlement Ledger" Reskin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire live ProofMarket Next.js frontend to the "Settlement Ledger" design (newspaper/broadsheet chrome + Space Mono, dual paper/terminal themes) while preserving every on-chain wiring path, API route, and pinned test contract.

**Architecture:** Presentational reskin only — no changes to hooks, lib/chain wiring, API routes, or Anchor client. Introduce a design-token layer (`[data-theme="paper"|"terminal"]` CSS variables) that all UI reads through; add newspaper chrome (dateline → masthead → nav → footer) as shared layout components wrapping the existing 5 real Next routes; retheme the ~12 feature components in place, keeping their `data-step`/`data-bar`/`data-state` hooks and exact copy strings intact.

**Tech Stack:** Next.js 14.2 App Router, React 18, TypeScript strict, Tailwind CSS 3.4 + shadcn/ui (base-nova), zustand, react-query, @solana/wallet-adapter, framer-motion, vitest/jsdom. New: Space Mono via `next/font/google`.

**Reference spec (line-level source of truth):** `/private/tmp/claude-501/-Users-kooroot-Desktop-dev-prediction-bot/503344ca-41a1-422b-a428-9ea202833813/scratchpad/Ledger.dc.html` (the imported `ProofMarket Ledger.dc.html`, 792 lines). Each task cites the section of this file that defines the target markup/data.

## Global Constraints

- **Devnet only, test-USDC, no real money.** No behavioral change to staking/faucet/claim — this is a visual reskin.
- **Preserve all 38 vitest test files GREEN.** The reskin is DOM-contract-preserving. The pinned contracts (verbatim) are:
  - `ProofChain.test.tsx`: exactly `querySelectorAll("[data-step]").length === 6`; step titles present verbatim — `"Stat leaf — the fact being proven"`, `"Event-stat root"`, `/Fixture sub-tree root — match 18172280/i`, `/Daily root — the on-chain anchor/i`, `/validate_stat re-walks the proof on-chain → one bool/i`, `"Escrow release — winners claim"`; `/inner return AQ== → TRUE/i`; `/EXISTS/i`; a link `role=link name=/Explorer → claim transfer/i` whose href contains `CLAIM`; `/goals = 1/` present AND `queryByText(/period/i)` is `null`; two-stat variant shows `/P1 goals = 1/` and `/P2 goals = 0/`.
  - `ProofChain.integrity.test.tsx`: `[data-step].length === 6`; `/goals = 1/`; `/AQ==/`. (byte-equality assertions are on lib data, unaffected by reskin.)
  - `replay/[fixtureId]/page.test.tsx`: exact strings `"🇦🇷 Argentina vs 🇨🇻 Cape Verde"`, `"🏁 Match Winner"`, `"Will Argentina beat Cape Verde?"`, `"YES: Argentina wins"`, `"Argentina goals = 3"`, `"Argentina 3 - 2 Cape Verde"`, `"Live score"`, `"Goal timeline"`, `"Replay clock 112:00"`, `"13:51"`, `"3-2"`.
  - `m/[marketPda]/page.test.tsx`: heading `/Will Switzerland beat Colombia\?/`; labels `YES pool`, `NO pool`, `Resolve predicate`, `TxLINE fixtureId`, `statKey`, `resolveAfter`, `Proof status`; `1 - 2`; `Jun 30, 2026`; `UTC`; and NO raw ISO timestamp (`queryByText(/T\d{2}:\d{2}:\d{2}\.\d{3}Z/)` absent).
  - `portfolio/page.test.tsx`: tab names `"Open (1)"` / `"Settled (1)"`; buttons `Claim`; links `View market` / `View Proof Receipt`; open panel wrapper carries `data-state="open"`.
  - `TwinBar.test.tsx`: bars found via `data-bar`.
  - `MarketCard`, `MainnetFixturePreview`, `FaucetButton`, `PlayAsGuestButton`, `UmaContrastCard` tests assert their existing visible copy — keep those strings.
  - **Rule for every task:** never delete/rename a `data-step`, `data-bar`, `data-state` attribute or any test-asserted string. Restyle by changing className/style/wrapping elements only. If a test string lives in a component you retheme, it must still render that exact string.
- **Dual theme via CSS variables on `<html data-theme>`.** Default `paper`. Toggle persists to `localStorage` key `pm-theme`. Token values are verbatim from the design (see Task 1). No `.dark`-class dependency; drive everything through these vars.
- **Fonts:** display+body = `"Helvetica Neue",Helvetica,Arial,sans-serif`; mono = `"Space Mono",ui-monospace,monospace`. Space Mono loaded via `next/font/google` (weights 400,700; style normal+italic). Geist is removed from the rendered UI.
- **Chrome on every route:** top dateline bar + masthead (logo + tagline + DEVNET pill + FAUCET + CONNECT WALLET + theme toggle) + nav (Index/Market/Replay/Portfolio) + footer. `max-width:1160px`, `padding:0 28px`.
- **Keep all on-chain wiring, hooks, API routes, IDL, PDAs unchanged.** Do not edit `src/hooks/*`, `src/lib/*` (except purely presentational label helpers if needed), `src/app/api/*`, `src/idl/*`.
- **Real Next routes, not the design's SPA route-state.** Map design route-states → existing routes: `home`→`/`, `market`→`/m/[marketPda]`, `replay`→`/replay/[fixtureId]`, `receipt`→`/m/[marketPda]/receipt`, `portfolio`→`/portfolio`.
- **Each phase ≤5 files. Verify (typecheck + relevant vitest + build) then commit before the next phase.** Verify command: `cd web && npm run typecheck && npm run test && npm run build`.
- **Commit trailers** on every commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_016PTTnRAKEdpRzG91aHyLAA
  ```
- **Branch:** work directly on `main` (established trunk-based workflow for this repo). Never `git checkout -b`, `git add -A`, or touch the parent repo `/Users/kooroot/Desktop/dev/prediction-bot`.
- **Prod deploy requires explicit per-action user confirmation** (AskUserQuestion) — do NOT auto-deploy.

### Palette (verbatim from design)

```css
/* paper (default) */
--paper:#EFEBE1; --panel:#F7F4EC; --panel2:#E7E2D5; --ink:#1A1712; --ink2:#6B6558;
--rule:rgba(26,23,18,.16); --rule2:rgba(26,23,18,.34);
--true:#0E6B3F; --trueSoft:rgba(14,107,63,.10); --false:#B23A17; --falseSoft:rgba(178,58,23,.08);
--sky:#20618f; --violet:#6b46c1; --fuchsia:#a21caf;
/* terminal */
--paper:#0B0C0A; --panel:#131412; --panel2:#1B1C19; --ink:#ECE8DE; --ink2:#8C8676;
--rule:rgba(236,232,222,.15); --rule2:rgba(236,232,222,.32);
--true:#46D98C; --trueSoft:rgba(70,217,140,.12); --false:#E8703A; --falseSoft:rgba(232,112,58,.12);
--sky:#7cc0ff; --violet:#b79cff; --fuchsia:#f0a6ec;
```

### Keyframes (verbatim from design, add to globals.css)

`fadeUp`, `stampIn`, `tick`, `barGrow`, `blink` — copy from `Ledger.dc.html` `<style>` block (lines ~35-40). `[data-anim="off"] *{animation:none!important}` retained for reduced-motion / test stability.

---

## Task 1: Design-token foundation, fonts, theme toggle

**Files:**
- Modify: `web/src/app/globals.css` — add the ledger token layer + keyframes + base element styles under `:root` (paper) and `[data-theme="terminal"]`. Keep existing shadcn OKLCH tokens block intact below (so `ui/*` primitives still compile); add a compatibility remap so shadcn `--background/--foreground/--border/--primary/--card/--muted/--destructive/--ring` resolve to the ledger vars.
- Modify: `web/tailwind.config.ts` — add color tokens `paper, panel, panel2, ink, ink2, rule, rule2, true→"proof"(alias), false→"revert", sky, violet, fuchsia` mapped to `var(--…)`; add fontFamily `mono:["var(--font-space-mono)",...]`, `display/sans:['"Helvetica Neue"',Helvetica,Arial,...]`. (Note: `true`/`false` are reserved-ish; expose as Tailwind color names `proof` and `revert` but the raw CSS var names stay `--true`/`--false` to match design copy.)
- Modify: `web/src/app/layout.tsx` — load Space Mono via `next/font/google` (`Space_Mono`, weights `["400","700"]`, style `["normal","italic"]`, variable `--font-space-mono`), set `<html data-theme="paper" className={spaceMono.variable}>`, drop Geist local-font wiring from the rendered classes (files may remain). Inject an inline no-flash script that reads `localStorage.pm-theme` and sets `data-theme` before paint.
- Create: `web/src/components/ThemeToggle.tsx` — client component; reads/writes zustand theme slice; sets `document.documentElement.dataset.theme`; renders a mono `PAPER / TERMINAL` segmented control (styled per masthead).
- Modify: `web/src/store/ui.ts` — add `theme: "paper"|"terminal"`, `setTheme(t)`, hydrate from `localStorage` (guarded for SSR), persist on set.

**Interfaces:**
- Produces: CSS vars `--paper/--panel/--panel2/--ink/--ink2/--rule/--rule2/--true/--trueSoft/--false/--falseSoft/--sky/--violet/--fuchsia`; Tailwind colors `paper,panel,panel2,ink,ink2,rule,rule2,proof,revert,sky,violet,fuchsia`; font vars `--font-space-mono`; `useUi().theme` + `useUi().setTheme`; `<ThemeToggle/>`.

- [ ] Add tokens + keyframes to `globals.css`; verify existing shadcn tokens still present.
- [ ] Add Tailwind color/font mappings.
- [ ] Wire Space Mono + `data-theme` + no-flash script in `layout.tsx`.
- [ ] Add theme slice to `store/ui.ts`; write `store/ui.test.ts` case: `setTheme("terminal")` updates state (extend existing test file).
- [ ] Build `ThemeToggle.tsx`.
- [ ] Verify: `cd web && npm run typecheck && npm run test && npm run build`. Commit: `feat(web): ledger design tokens, Space Mono, dual-theme toggle`.

---

## Task 2: Newspaper chrome — dateline, masthead, nav, footer

**Files:**
- Create: `web/src/components/ledger/Masthead.tsx` — dateline bar (`PROOFMARKET · SETTLEMENT LEDGER` / `SOLANA / DEVNET` / `EPOCH …` / path) + masthead row (inline logo SVG from design lines 60-70, wordmark, tagline `No vote · No dispute window · Just math`, DEVNET blink pill, `FAUCET` + `CONNECT WALLET` slots, `<ThemeToggle/>`) + nav row (Index/Market/Replay/Portfolio with active state from `usePathname()`). Reuse existing `FaucetButton`, `PlayAsGuestButton`, `WalletMultiButton` (dynamic, ssr:false) inside the masthead action slots.
- Create: `web/src/components/ledger/Footer.tsx` — 4-column footer from design lines 508-532 (brand blurb, Ledger links, On-chain ids `program 6QNd5m…LZuEb` / `mint 2MYAvD…HA8LT` / `cluster devnet`, Data column) + hackathon line.
- Create: `web/src/components/ledger/Shell.tsx` — wraps children with `max-w-[1160px]` main + Masthead + Footer; the single chrome used by all pages.
- Modify: `web/src/app/layout.tsx` — replace `<Navbar/>` with `<Shell>`.
- Modify: `web/src/components/Navbar.tsx` — keep for now only if referenced by tests; otherwise fold its wallet/balance logic into Masthead and delete. (Check `Navbar.test.tsx` existence first; if none, delete.)

**Interfaces:**
- Consumes: `<ThemeToggle/>`, `FaucetButton`, `PlayAsGuestButton`, tokens.
- Produces: `<Shell>{children}</Shell>`, `<Masthead/>`, `<Footer/>`.

- [ ] Build Masthead with active-nav via `usePathname()` (map `/m/*` + receipt → "Market" active).
- [ ] Build Footer.
- [ ] Build Shell; wire into `layout.tsx`.
- [ ] Reconcile Navbar (fold/delete) — grep tests first.
- [ ] Verify + commit: `feat(web): ledger newspaper chrome (masthead, nav, footer)`.

---

## Task 3: Home / Index route

**Files:**
- Modify: `web/src/app/page.tsx` — rebuild per design lines 76-224: hero (numbered rail + `No vote. / No dispute window. / Just math.` + guest/replay CTAs) with specimen-receipt column; stats strip (`1,000 / 1 tx / 0 SOL`); "The Book" markets table (column header + rows from `useMarkets`); stat-proof demos; "Upcoming — mainnet preview" from `MainnetFixturePreviewPanel`; contrast section (`UmaContrastCard`).
- Create: `web/src/components/ledger/BookRow.tsx` — one market row in the table grid (`minmax(0,1fr) 140px 66px 66px 92px 152px`) using `demoMarketCopy(m)` for badge/flagTitle/question, `TwinBar`/impliedPct, YES×/NO×, volume, resolveAfter; `VALIDATED ✓` when Resolved; links to `/m/{pda}` or receipt. Replaces `MarketCard` on the home grid (keep `MarketCard.tsx` if its test still references it — otherwise adapt the test-covered copy into BookRow).
- Modify: `web/src/components/TwinBar.tsx` — retheme to design bar (`--panel2` track, `--true` fill, `barGrow`); keep `data-bar`.
- Modify: `web/src/components/MainnetFixturePreview.tsx` — retheme the hero/upcoming grid to ledger rows (design lines 194-224); keep asserted copy.
- Modify: `web/src/components/UmaContrastCard.tsx` — retheme to the design "Proof, not a vote" table (lines 200-224 / 445-457); keep asserted copy strings.

**Interfaces:**
- Consumes: `useMarkets`, `demoMarketCopy`, `TwinBar`, `MainnetFixturePreviewPanel`, `UmaContrastCard`, tokens.
- Produces: `<BookRow m label pFair />`.

- [ ] Retheme TwinBar (verify `TwinBar.test.tsx` still green).
- [ ] Build BookRow.
- [ ] Rebuild `page.tsx` layout with hero + stats + Book + demos + upcoming + contrast.
- [ ] Retheme MainnetFixturePreview + UmaContrastCard (verify their tests).
- [ ] Verify + commit: `feat(web): ledger home — hero, The Book, upcoming, contrast`.

---

## Task 4: Market detail + StakePanel

**Files:**
- Modify: `web/src/app/m/[marketPda]/page.tsx` — rebuild per design lines 246-306: back-to-Index link, badge + flagTitle + `VALIDATED ✓` when settled, question `<h1>`, YES/NO label chips, implied bar, **pool ledger spec grid** with the exact labels (`YES pool`,`NO pool`,`Resolve predicate`,`TxLINE fixtureId`,`statKey`,`resolveAfter`,`Proof status`), `<StakePanel>` (open) or settled card (design lines 288-303), closing CPI note. Preserve heading `/Will Switzerland beat Colombia\?/`, `1 - 2`, `Jun 30, 2026`, `UTC`, and no raw ISO timestamp.
- Modify: `web/src/components/StakePanel.tsx` — retheme YES/NO toggle + USDC input + payout preview + stake button to design (lines 271-287). Keep react-query invalidations + tx build. Keep any asserted copy.
- Modify: `web/src/components/PositionRow.tsx` — (settled row styling shared with portfolio) retheme claim button + receipt link; keep `Claim`, `View Proof Receipt` strings. (Also used by Task 7 portfolio.)

**Interfaces:**
- Consumes: `usePosition`/`useMarkets`, `demoMarketCopy`, `payoutForStake`, tx builders, tokens.

- [ ] Retheme StakePanel; verify no test regressions.
- [ ] Rebuild market-detail page; run `m/[marketPda]/page.test.tsx`.
- [ ] Retheme PositionRow (settled bits).
- [ ] Verify + commit: `feat(web): ledger market detail + stake panel`.

---

## Task 5: Proof receipt + ProofChain proof-walk (MOST test-sensitive)

**Files:**
- Modify: `web/src/components/ProofChain.tsx` — retheme the 6-step rail to the design proof-walk (lines 419-458): `Verified by validate_stat` stamp (`stampIn`), rail dots (`tick`), green/neutral tokens, chip colors from `--sky/--violet/--fuchsia/--true`, fold labels. **Keep exactly 6 `data-step` cards and every asserted title/string verbatim** (see Global Constraints). Keep `VerifyToggle`, explorer links, `Explorer → claim transfer` link with `CLAIM` href.
- Modify: `web/src/components/ProofStep.tsx` — retheme `HashChip` (tone→token color, `#`+5-byte hex), `ProofStep` (keep `data-step` on card, `idx/title/subtitle/body/source/green/last`), `FoldConnector`. framer-motion animations retained.
- Modify: `web/src/components/VerifyToggle.tsx` — retheme; keep `NEXT_PUBLIC_FOLD_VERIFIED` behavior + disclaimer copy.
- Modify: `web/src/app/m/[marketPda]/receipt/page.tsx` — retheme intro block (design lines 406-417) + wrap `ProofChain` + `UmaContrastCard` in ledger layout. Keep title.
- Modify: `web/src/components/UmaContrastCard.tsx` — (if not already fully done in Task 3) the receipt "Proof vs vote" sidebar variant (design lines 445-457).

**Interfaces:**
- Consumes: `AnchorBundle`, `ValidateResult`, tokens.

- [ ] Retheme ProofStep (HashChip/ProofStep/FoldConnector); run `ProofChain.test.tsx` + `ProofChain.integrity.test.tsx` after.
- [ ] Retheme ProofChain rail + stamp; re-run both ProofChain tests (must be 6 steps, all strings).
- [ ] Retheme VerifyToggle + receipt page.
- [ ] Verify + commit: `feat(web): ledger proof receipt + ProofChain walk`.

---

## Task 6: Replay route

**Files:**
- Modify: `web/src/app/replay/[fixtureId]/page.tsx` — retheme per design lines 309-404: broadcast panel header (status pill + clock + speed 1×/2× + Play) + progress bar; live-score panel (`Argentina {p1} – {p2} Cape Verde`, raw stat leaf `Argentina goals = {p1}` / `Cape Verde goals = {p2}`); goal-timeline list; on `done`, the FULL-TIME resolution-walk + settlement-log terminal (design lines 354-402) then swap-in `ProofChain` + `UmaContrastCard`. **Preserve exact asserted strings** (Global Constraints): `"🇦🇷 Argentina vs 🇨🇻 Cape Verde"`, `"🏁 Match Winner"`, `"Will Argentina beat Cape Verde?"`, `"YES: Argentina wins"`, `"Argentina goals = 3"`, `"Argentina 3 - 2 Cape Verde"`, `"Live score"`, `"Goal timeline"`, `"Replay clock 112:00"`, `"13:51"`, `"3-2"`. Keep `useReplayClock` (existing 45s scrub) as the clock source — restyle around it; the design's RAF/speed toggle is optional polish only if it does not disturb the pinned strings/timing the test asserts.
- Create (optional): `web/src/components/ledger/SettlementLog.tsx` — the terminal settlement-log presentational component (design lines 383-398) if it helps keep the page file focused. Only if it stays ≤5 files total.

**Interfaces:**
- Consumes: `useReplayClock`, `ProofChain`, `UmaContrastCard`, tokens.

- [ ] Retheme replay page around existing clock; run `replay/[fixtureId]/page.test.tsx` (all pinned strings).
- [ ] Verify + commit: `feat(web): ledger replay broadcast + settlement log`.

---

## Task 7: Portfolio + remaining components + assets

**Files:**
- Modify: `web/src/app/portfolio/page.tsx` — retheme Open/Settled tabs (design lines 461-503). Keep tab names `Open (N)` / `Settled (N)`, `data-state="open"` wrapper, `Claim`, `View market`, `View Proof Receipt` strings.
- Modify: `web/src/components/FaucetButton.tsx` — retheme to mono ledger button; keep label cycle strings.
- Modify: `web/src/components/PlayAsGuestButton.tsx` — retheme; keep label cycle strings.
- Add assets: fetch `assets/favicon.svg`, `assets/logo-mark.svg`, `assets/favicon-32.png`, `assets/apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png` from the design project into `web/public/` (+ wire `layout.tsx` `<head>` icons / `metadata.icons` if not covered by Masthead inline SVG). (Grouped here as one deliverable.)
- Modify: wallet-adapter button style override — move the `[&_.wallet-adapter-button]:…` overrides from old Navbar into Masthead or `globals.css` so `CONNECT WALLET` matches the ledger button.

**Interfaces:**
- Consumes: `usePortfolioPositions`, `PositionRow`, tokens.

- [ ] Retheme portfolio page; run `portfolio/page.test.tsx`.
- [ ] Retheme FaucetButton + PlayAsGuestButton; run their tests.
- [ ] Add favicon/logo assets + wallet button override.
- [ ] Verify + commit: `feat(web): ledger portfolio, faucet/guest buttons, brand assets`.

---

## Task 8: Full verification, dual-theme visual QA, deploy

**Files:** none (verification + ops).

- [ ] Full gate: `cd web && npm run typecheck && npm run lint && npm run test && npm run build` — all green (38 test files).
- [ ] Repo gate: `cd proofmarket && bash scripts/judge-check.sh` — web suite green within it.
- [ ] Playwright dual-viewport (desktop 1280 + mobile 390) × dual-theme (paper + terminal) screenshots of `/`, `/m/<pda>`, `/m/<pda>/receipt`, `/replay/18175918`, `/portfolio`; eyeball against `Ledger.dc.html`. Fix visual regressions.
- [ ] Commit any QA fixes: `fix(web): ledger reskin visual QA`.
- [ ] AskUserQuestion for production Vercel deploy (per standing constraint). If approved: `cd web && vercel --prod`; verify live `-tan` URL both themes.

---

## Self-Review

**Spec coverage:** design's 5 route-states → Tasks 3/4/5/6/7 (home/market/receipt/replay/portfolio); chrome → Task 2; tokens+themes+fonts → Task 1; contrast/proofwalk/specimen all mapped. Assets → Task 7. ✅
**Placeholder scan:** no "TBD"; every task names exact files + the design line ranges that supply markup + the exact strings to preserve. The design file is the line-level code source, cited per task (avoids reproducing 700 lines of JSX in the plan). ✅
**Type consistency:** token names, Tailwind color names (`proof`/`revert` aliases for `--true`/`--false`), `useUi().theme/setTheme`, `<Shell>/<Masthead>/<Footer>`, `<BookRow>` used consistently across tasks. ✅
**Test-contract risk:** concentrated in Tasks 4/5/6/7; each task's last step re-runs the specific pinned test file. ✅
