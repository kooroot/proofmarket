import { PublicKey } from "@solana/web3.js";
import {
  explorerAddrForNetwork,
  explorerTxForNetwork,
  getTxlineSettlementNetworkConfig,
} from "./txline-network";

const SETTLEMENT_TXLINE = getTxlineSettlementNetworkConfig();

export const TXORACLE_PROGRAM_ID = SETTLEMENT_TXLINE.programId;
export const PROOFMARKET_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROOFMARKET_PROGRAM_ID!
);
export const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
export const USDC_DECIMALS = 6;
export const MIN_STAKE = 1_000n; // base units, CANONICAL CONTRACT
export const MAX_FEE_BPS = 1000; // CANONICAL CONTRACT
export const MARKET_SEED = Buffer.from("market");
export const POSITION_SEED = Buffer.from("position");
export const VAULT_SEED = Buffer.from("vault");
export const DAILY_ROOTS_SEED = Buffer.from("daily_scores_roots");
export const explorerTx = (sig: string) =>
  explorerTxForNetwork(sig, SETTLEMENT_TXLINE.network);
export const explorerAddr = (a: string) =>
  explorerAddrForNetwork(a, SETTLEMENT_TXLINE.network);
