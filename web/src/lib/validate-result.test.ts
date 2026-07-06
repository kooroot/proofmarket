import { describe, it, expect } from "vitest";
import { parseValidateStatResult } from "./validate-result";
const LOGS_TRUE = [
  "Program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J invoke [2]",
  "Program log: Stage 1 Validation", "Program log: Predicate evaluated to: true",
  "Program return: 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J AQ==",
  "Program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J success",
];
const LOGS_FALSE = [...LOGS_TRUE.slice(0, 2), "Program log: Predicate evaluated to: false", "Program return: 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J AA=="];
describe("parseValidateStatResult (inner log keyed to 6pW64g…)", () => {
  it("reads TRUE / AQ==", () => { const r = parseValidateStatResult(LOGS_TRUE); expect(r.predicateTrue).toBe(true); expect(r.returnBase64).toBe("AQ=="); expect(r.returnBool).toBe(true); });
  it("reads FALSE / AA==", () => { const r = parseValidateStatResult(LOGS_FALSE); expect(r.predicateTrue).toBe(false); expect(r.returnBool).toBe(false); });
  it("can read mainnet validate_stat replay logs when the program id is supplied", () => {
    const mainnetProgram = "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA";
    const r = parseValidateStatResult(
      [
        "Program log: Predicate evaluated to: true",
        `Program return: ${mainnetProgram} AQ==`,
      ],
      mainnetProgram
    );

    expect(r.returnBool).toBe(true);
  });
  it("returns nulls when absent", () => { expect(parseValidateStatResult([]).returnBase64).toBeNull(); });
});
