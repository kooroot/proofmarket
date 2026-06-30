import { test, expect } from "bun:test";
import { buildActivationMessage, authHeaders } from "../src/ingestion/access.ts";

test("activation message binds txSig:leagues:jwt", () => {
  expect(buildActivationMessage("SIG", "JWT", [430, 72])).toBe("SIG:430,72:JWT");
});

test("empty leagues collapses to SIG::JWT (SL1 free-tier shape)", () => {
  expect(buildActivationMessage("SIG", "JWT", [])).toBe("SIG::JWT");
});

test("dual-header auth shape on every data call", () => {
  expect(authHeaders("JWT", "API")).toEqual({
    Authorization: "Bearer JWT",
    "X-Api-Token": "API",
  });
});
