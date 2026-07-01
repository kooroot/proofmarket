import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "@/idl/proofmarket.json";
import type { Proofmarket } from "@/idl/proofmarket";
export function getProgram(provider: AnchorProvider): Program<Proofmarket> {
  return new Program<Proofmarket>(idl as Proofmarket, provider);
}
