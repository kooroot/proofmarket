import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui";
describe("ui store", () => {
  beforeEach(() => useUiStore.setState({ mode: "live", replayClockMs: 0, selectedMarket: null }));
  it("toggles replay mode", () => { useUiStore.getState().setMode("replay"); expect(useUiStore.getState().mode).toBe("replay"); });
  it("advances replay clock", () => { useUiStore.getState().setReplayClockMs(120000); expect(useUiStore.getState().replayClockMs).toBe(120000); });
});
