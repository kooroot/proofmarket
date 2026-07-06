const TXORACLE = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";
export interface ValidateResult { predicateTrue: boolean | null; returnBase64: string | null; returnBool: boolean | null; }
export function parseValidateStatResult(
  logs: string[],
  txoracleProgramId = TXORACLE
): ValidateResult {
  let predicateTrue: boolean | null = null, returnBase64: string | null = null;
  for (const l of logs) {
    if (l.startsWith("Program log: Predicate evaluated to: ")) predicateTrue = l.endsWith("true");
    if (l.startsWith(`Program return: ${txoracleProgramId} `)) returnBase64 = l.split(" ").pop() ?? null; // inner program, NOT tx.meta.returnData
  }
  const returnBool = returnBase64 === null ? null : Buffer.from(returnBase64, "base64")[0] === 1; // AQ==→1→true, AA==→0→false
  return { predicateTrue, returnBase64, returnBool };
}
