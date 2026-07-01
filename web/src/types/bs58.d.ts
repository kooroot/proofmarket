// bs58@4.0.1 ships no type declarations, and the only `@types/bs58` on npm (5.0.0) is the
// DefinitelyTyped stub for bs58 v5's self-typed API — it does not match v4. This minimal
// ambient declaration matches the v4 default-export (base-x) shape that burner.ts consumes.
declare module "bs58" {
  const bs58: {
    encode(source: Uint8Array | number[]): string;
    // Runtime returns a Node Buffer (Buffer extends Uint8Array, so tsc won't flag it). Callers MUST
    // Uint8Array.from() the result before handing it to @noble/curves APIs (e.g. Keypair.fromSecretKey):
    // a cross-realm Buffer fails @noble's `instanceof Uint8Array` check under jsdom. See lib/burner.ts.
    decode(str: string): Uint8Array;
  };
  export default bs58;
}
