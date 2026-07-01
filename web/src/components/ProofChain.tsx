"use client";
import { ProofStep } from "./ProofStep";
import { VerifyToggle } from "./VerifyToggle";
import type { AnchorBundle } from "@/lib/proof";
import type { ValidateResult } from "@/lib/validate-result";
import { explorerAddr, explorerTx } from "@/lib/constants";
const head = (a: number[]) => `[${a.slice(0, 6).join(",")}…]`;
export function ProofChain({ bundle, dailyRoot, epochDay, rootExists, validate, resolveTx, claimTxs }: { bundle: AnchorBundle; dailyRoot: string; epochDay: number; rootExists: boolean; validate: ValidateResult; resolveTx: string | undefined; claimTxs: string[] }) {
  return (
    <div className="space-y-3">
      <ProofStep idx={0} title="Stat leaf" body={`{key:${bundle.statToProve.key}, value:${bundle.statToProve.value}} → P1 goals = ${bundle.statToProve.value}.`} source="/api/scores/stat-validation" />
      <VerifyToggle bundle={bundle} enabled={process.env.NEXT_PUBLIC_FOLD_VERIFIED === "1"} />
      <ProofStep idx={1} title="leaf → eventStatRoot" body={`statProof[${bundle.statProof.length}] folds to eventStatRoot ${head(bundle.eventStatRoot)}`} source="/api/scores/stat-validation" />
      <ProofStep idx={2} title="eventStatRoot → fixture sub-tree" body={`fixtureProof[${bundle.fixtureProof.length}] → eventsSubTreeRoot ${head(bundle.eventsSubTreeRoot)} · fixtureId ${bundle.fixtureId} · updateCount ${bundle.updateCount}`} source="/api/scores/stat-validation" />
      <ProofStep idx={3} title="fixture sub-tree → daily root (on-chain PDA)" body={`mainTreeProof[${bundle.mainTreeProof.length}] · epochDay ${epochDay}`} link={explorerAddr(dailyRoot)} linkLabel={`Explorer → daily-root PDA ${rootExists ? "(EXISTS)" : "(checking…)"}`} green={rootExists} source={`PDA ["daily_scores_roots", ${epochDay} u16 LE]`} />
      <ProofStep idx={4} title="escrow → CPI → validate_stat → bool" body={`ProofMarket escrow (outer) → inner CPI → validate_stat → ${validate.predicateTrue === true ? "true" : validate.predicateTrue === false ? "false" : "pending"} → gate release. inner return ${validate.returnBase64 ?? "—"}`} link={resolveTx ? explorerTx(resolveTx) : undefined} linkLabel="Explorer → settle tx inner instructions" green={validate.returnBool === true} source="program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J" />
      <ProofStep idx={5} title="→ escrow release (per-winner claim)" body={resolveTx ? `each winner pulls stake_i · payout_pool / winning_pool from the vault PDA` : "pending — settles once the escrow program deploys"} link={claimTxs[0] ? explorerTx(claimTxs[0]) : undefined} linkLabel="Explorer → claim transfer" green={claimTxs.length > 0} source="escrow vault PDA" />
    </div>
  );
}
