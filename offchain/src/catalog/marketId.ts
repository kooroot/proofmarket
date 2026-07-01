import { createHash } from "node:crypto";
import type { MarketDefinitionBase } from "./types.ts";

const MAGIC = "proofmarket:v1";

const u8 = (n: number) => { const b = Buffer.alloc(1); b.writeUInt8(n & 0xff, 0); return b; };
const u16le = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff, 0); return b; };
const u32le = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; };
const i32le = (n: number) => { const b = Buffer.alloc(4); b.writeInt32LE(n | 0, 0); return b; };
const i64le = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(n, 0); return b; };

export function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

/** §3.4 length-prefixed predicate-array preimage (binds every sub-predicate + the title). */
export function marketIdPreimage(def: MarketDefinitionBase, titleHash: Buffer): Buffer {
  const parts: Buffer[] = [
    Buffer.from(MAGIC, "utf8"),
    i64le(BigInt(def.fixtureId)),
    u16le(def.marketScopePeriod),
    u8(def.combinatorCode),
    u8(def.predicates.length),
  ];
  for (const p of def.predicates) {
    parts.push(u32le(p.statKeyA), u32le(p.statKeyB), u8(p.opCode), u8(p.comparisonCode), i32le(p.threshold));
  }
  parts.push(titleHash);
  return Buffer.concat(parts);
}

/** market_id = first 8 bytes of sha256(preimage), read LE so Market PDA seed == those 8 bytes. */
export function deriveMarketId(def: MarketDefinitionBase, title: string): bigint {
  const titleHash = sha256(Buffer.from(title, "utf8"));
  const digest = sha256(marketIdPreimage(def, titleHash));
  return digest.readBigUInt64LE(0);
}
