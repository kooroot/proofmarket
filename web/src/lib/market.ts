import { PublicKey } from "@solana/web3.js";
import { PROOFMARKET_PROGRAM_ID, TXORACLE_PROGRAM_ID, MARKET_SEED, VAULT_SEED, POSITION_SEED, DAILY_ROOTS_SEED } from "./constants";
const u64le = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; };
const u16le = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export function marketPda(marketId: bigint): PublicKey { return PublicKey.findProgramAddressSync([MARKET_SEED, u64le(marketId)], PROOFMARKET_PROGRAM_ID)[0]; }
export function vaultPda(market: PublicKey): PublicKey { return PublicKey.findProgramAddressSync([VAULT_SEED, market.toBuffer()], PROOFMARKET_PROGRAM_ID)[0]; }
export function positionPda(market: PublicKey, owner: PublicKey): PublicKey { return PublicKey.findProgramAddressSync([POSITION_SEED, market.toBuffer(), owner.toBuffer()], PROOFMARKET_PROGRAM_ID)[0]; }
export function dailyRootPda(epochDay: number): PublicKey { return PublicKey.findProgramAddressSync([DAILY_ROOTS_SEED, u16le(epochDay)], TXORACLE_PROGRAM_ID)[0]; }
export function epochDayFromTs(tsMs: number | bigint): number { return Math.floor(Number(tsMs) / 86_400_000); } // §4.12: pin ts source via Gate G4
export interface RawMarket {
  marketId: bigint; fixtureId: bigint; statAKey: number; statAPeriod: number; statBKey?: number | null; statBPeriod?: number | null; op: number | null;
  threshold: number; comparison: number; yesPool: bigint; noPool: bigint; feeBps: number;
  resolveAfterTs: bigint; state: number; outcome: number;
}
export interface UiMarket {
  pda: string; marketId: bigint; fixtureId: bigint; statAKey: number; statAPeriod: number; statBKey: number | null; statBPeriod: number | null; op: number | null;
  threshold: number; comparison: number; yesPool: bigint; noPool: bigint; feeBps: number; lockTs: bigint; state: number; outcome: number;
}
export function toUiMarket(pda: string, raw: RawMarket): UiMarket {
  return { pda, marketId: BigInt(raw.marketId), fixtureId: BigInt(raw.fixtureId), statAKey: raw.statAKey, statAPeriod: raw.statAPeriod,
    statBKey: raw.statBKey ?? null, statBPeriod: raw.statBPeriod ?? null, op: raw.op ?? null, threshold: raw.threshold, comparison: raw.comparison, yesPool: BigInt(raw.yesPool), noPool: BigInt(raw.noPool),
    feeBps: raw.feeBps, lockTs: BigInt(raw.resolveAfterTs), state: raw.state, outcome: raw.outcome };
}
export const STATE = { Open: 0, Locked: 1, Resolved: 2, Void: 3, Closed: 4 } as const;
export const OUTCOME = { Unset: 0, Yes: 1, No: 2 } as const;
