"use client";
import { ProofStep, FoldConnector, HashChip } from "./ProofStep";
import { VerifyToggle } from "./VerifyToggle";
import type { AnchorBundle } from "@/lib/proof";
import type { ValidateResult } from "@/lib/validate-result";
import { explorerAddr, explorerTx } from "@/lib/constants";
import { statKeyLabel } from "@/lib/predicate";

const byteHex = (n: number) => n.toString(16).padStart(2, "0");
const leafLine = (term: { key: number; value: number }) => `${statKeyLabel(term.key)} = ${term.value}`;

/** The resolution walk as a connected diagram: each fold's output hash is visibly the next
 *  node's input, ending at the on-chain daily root that gates the escrow. */
export function ProofChain({ bundle, dailyRoot, epochDay, rootExists, validate, resolveTx, claimTxs }: { bundle: AnchorBundle; dailyRoot: string; epochDay: number; rootExists: boolean; validate: ValidateResult; resolveTx: string | undefined; claimTxs: string[] }) {
  const leafBytes = [bundle.statToProve.key, bundle.statToProve.value, bundle.statToProve.period].map(byteHex).join(" ");
  const leaf2Bytes = bundle.statToProve2 ? [bundle.statToProve2.key, bundle.statToProve2.value, bundle.statToProve2.period].map(byteHex).join(" ") : null;
  const verdict = validate.predicateTrue === true ? "TRUE" : validate.predicateTrue === false ? "FALSE" : "pending";
  return (
    <div className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
      <ProofStep idx={0} title="Stat leaf — the fact being proven" subtitle="Straight from TxLINE's signed match feed: the stat leaf or leaves this market bets on."
        body={<><div className="text-sm font-semibold text-zinc-100">{leafLine(bundle.statToProve)}</div>
          <span className="text-zinc-500">leaf bytes </span><HashChip bytes={[bundle.statToProve.key, bundle.statToProve.value, bundle.statToProve.period]} tone="sky" /> <span className="text-zinc-500">= {leafBytes}</span>
          {bundle.statToProve2 && <div className="mt-2">
            <div className="text-sm font-semibold text-zinc-100">{leafLine(bundle.statToProve2)}</div>
            <span className="text-zinc-500">leaf bytes </span><HashChip bytes={[bundle.statToProve2.key, bundle.statToProve2.value, bundle.statToProve2.period]} tone="sky" /> <span className="text-zinc-500">= {leaf2Bytes}</span>
          </div>}</>}
        source="/api/scores/stat-validation" />
      <div className="flex justify-center"><span className="w-px self-stretch bg-zinc-800" /></div>
      <div className="pt-1.5"><VerifyToggle bundle={bundle} enabled={process.env.NEXT_PUBLIC_FOLD_VERIFIED === "1"} /></div>

      <FoldConnector idx={0} label={<>keccak256 fold ⊕ statProof[{bundle.statProof.length}{bundle.statProof2 ? ` + ${bundle.statProof2.length}` : ""}] = <HashChip bytes={bundle.eventStatRoot} tone="violet" /></>} />
      <ProofStep idx={1} title="Event-stat root" subtitle="Sibling hashes fold the leaf upward — change a single digit anywhere and this root no longer matches."
        body={<HashChip bytes={bundle.eventStatRoot} tone="violet" prefix="eventStatRoot" />}
        source="/api/scores/stat-validation" />

      <FoldConnector idx={1} label={<>fold ⊕ fixtureProof[{bundle.fixtureProof.length}] = <HashChip bytes={bundle.eventsSubTreeRoot} tone="fuchsia" /></>} />
      <ProofStep idx={2} title={`Fixture sub-tree root — match ${bundle.fixtureId}`} subtitle={`The event root folds again into this fixture's sub-tree (update #${bundle.updateCount}) — one branch of the whole matchday.`}
        body={<HashChip bytes={bundle.eventsSubTreeRoot} tone="fuchsia" prefix="subTreeRoot" />}
        source="/api/scores/stat-validation" />

      <FoldConnector idx={2} label={<>fold ⊕ mainTreeProof[{bundle.mainTreeProof.length}] → must equal the published on-chain root</>} />
      <ProofStep idx={3} title={`Daily root — the on-chain anchor (epochDay ${epochDay})`} subtitle="TxODDS publishes one Merkle root per day to this account. The walk must land exactly on it — this PDA is the only thing anyone has to trust."
        body={<span className="text-zinc-300">{dailyRoot.slice(0, 8)}…{dailyRoot.slice(-6)}{rootExists && <span className="ml-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 px-1 py-0.5 text-[10px] text-emerald-300">EXISTS ✓</span>}</span>}
        link={explorerAddr(dailyRoot)} linkLabel={`Explorer → daily-root PDA${rootExists ? "" : " (checking…)"}`} green={rootExists}
        source={`PDA ["daily_scores_roots", ${epochDay} u16 LE]`} />

      <FoldConnector idx={3} label="CPI — the escrow hands the whole proof to TxLINE's program" />
      <ProofStep idx={4} title="validate_stat re-walks the proof on-chain → one bool" subtitle="TxLINE's own program recomputes every fold inside the transaction. A forged proof doesn't get out-voted — it simply reverts."
        body={`inner return ${validate.returnBase64 ?? "—"} → ${verdict}`}
        link={resolveTx ? explorerTx(resolveTx) : undefined} linkLabel="Explorer → settle tx inner instructions" green={validate.returnBool === true}
        source="program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J" />

      <FoldConnector idx={4} label="the bool gates the vault — nothing else can move funds" />
      <ProofStep idx={5} last title="Escrow release — winners claim" subtitle="No vote. No dispute window. Each winner pulls their share by math alone."
        body={resolveTx || validate.predicateTrue !== null ? "payout_i = stake_i · payout_pool / winning_pool" : "pending — settles once the proof lands"}
        link={claimTxs[0] ? explorerTx(claimTxs[0]) : undefined} linkLabel="Explorer → claim transfer" green={claimTxs.length > 0}
        source="escrow vault PDA" />
    </div>
  );
}
