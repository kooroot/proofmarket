import { test, expect } from "bun:test";
import { parseSseBlock, splitSseStream } from "../src/ingestion/sse.ts";

test("parses a data frame with id + data:", () => {
  const f = parseSseBlock('id: 123:0\ndata: {"FixtureId":1}');
  expect(f).toEqual({ id: "123:0", event: undefined, data: '{"FixtureId":1}' });
});

test("parses a heartbeat frame", () => {
  const f = parseSseBlock('event: heartbeat\ndata: {"Ts":99}');
  expect(f?.event).toBe("heartbeat");
});

test("ignores SSE comments and blank-only blocks", () => {
  expect(parseSseBlock(": keep-alive comment")).toBeNull();
});

test("splits a CRLF stream on blank lines and keeps the partial remainder", () => {
  const buf = "data: {\"a\":1}\r\n\r\ndata: {\"b\":2}\r\n\r\ndata: {\"par";
  const { frames, rest } = splitSseStream(buf);
  expect(frames).toEqual(['data: {"a":1}', 'data: {"b":2}']);
  expect(rest).toBe('data: {"par');
});
