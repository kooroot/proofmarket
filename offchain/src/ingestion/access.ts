import { Keypair } from "@solana/web3.js";
import { getGuestJwt } from "./auth.ts";
import { subscribe, type SubscribeConfig } from "./subscribe.ts";
import { activateToken } from "./activate.ts";

/** EXACT binding the server recomputes — order + separators matter (spike activate.ts:31). */
export function buildActivationMessage(txSig: string, jwt: string, leagues: number[]): string {
  return `${txSig}:${leagues.join(",")}:${jwt}`;
}

/** Dual-header auth required on every TxLINE data call (TECH-REF §3). */
export function authHeaders(jwt: string, apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
}

export interface AccessResult {
  jwt: string;
  apiToken: string;
  headers: Record<string, string>;
}

/** 4-step access flow: guest JWT -> on-chain subscribe SL1 -> activate. v1 uses empty leagues (SL1 free). */
export async function bootstrapAccess(opts: {
  base: string;
  subscribeCfg: SubscribeConfig;
  wallet: Keypair;
  leagues?: number[];
}): Promise<AccessResult> {
  const leagues = opts.leagues ?? [];
  const jwt = await getGuestJwt(opts.base);
  const txSig = await subscribe(opts.subscribeCfg, opts.wallet);
  const apiToken = await activateToken(opts.base, txSig, jwt, leagues, opts.wallet.secretKey);
  return { jwt, apiToken, headers: authHeaders(jwt, apiToken) };
}
