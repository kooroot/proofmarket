import { create } from "zustand";
type Mode = "live" | "replay";
interface UiState {
  selectedMarket: string | null; setSelectedMarket: (pda: string | null) => void;
  mode: Mode; setMode: (m: Mode) => void;
  replayClockMs: number; setReplayClockMs: (ms: number) => void;
}
export const useUiStore = create<UiState>((set) => ({
  selectedMarket: null, setSelectedMarket: (pda) => set({ selectedMarket: pda }),
  mode: "live", setMode: (mode) => set({ mode }),
  replayClockMs: 0, setReplayClockMs: (replayClockMs) => set({ replayClockMs }),
}));
