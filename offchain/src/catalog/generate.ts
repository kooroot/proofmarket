import { isMonotoneKey } from "./keys.ts";
import { renderTitle } from "./title.ts";
import { deriveMarketId } from "./marketId.ts";
import { marketPda, vaultPda } from "./pda.ts";
import { V1_TEMPLATES, templateToPredicate } from "./templates.ts";
import { resolveAfterTsMs } from "./resolveWindow.ts";
import type { Fixture, MarketDefinition, MarketDefinitionBase } from "./types.ts";

export { V1_TEMPLATES };

export function buildCatalogForFixture(fx: Fixture): MarketDefinition[] {
  return V1_TEMPLATES.map((t) => {
    if (!isMonotoneKey(t.statKeyA)) throw new Error(`template ${t.id} key ${t.statKeyA} not monotone`);
    if (t.statKeyB !== undefined && !isMonotoneKey(t.statKeyB)) throw new Error(`template ${t.id} key ${t.statKeyB} not monotone`);
    if (t.statKeyB !== undefined && ![1, 2].includes(t.opCode ?? 0)) throw new Error(`template ${t.id} has invalid two-stat op`);
    const base: MarketDefinitionBase = {
      fixtureId: fx.FixtureId,
      marketScopePeriod: 0, // full-game
      combinatorCode: 0,    // single
      predicates: [templateToPredicate(t)],
    };
    const title = renderTitle(base);
    const marketId = deriveMarketId(base, title);
    const market = marketPda(marketId);
    return {
      ...base,
      templateId: t.id,
      title,
      marketId,
      marketPda: market.toBase58(),
      vaultPda: vaultPda(market).toBase58(),
      lockTs: fx.StartTime,
      resolveAfterTs: resolveAfterTsMs(fx.StartTime), // kickoff + 150 min (A.1)
    };
  });
}

/** Full off-chain catalog (precomputed market_id); on-chain materialization is selective (§3.3). */
export function generateCatalog(fixtures: Fixture[]): MarketDefinition[] {
  return fixtures.flatMap(buildCatalogForFixture);
}
