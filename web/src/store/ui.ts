import { create } from "zustand";
type Mode = "live" | "replay";
export type Theme = "paper" | "terminal";
interface UiState {
  selectedMarket: string | null; setSelectedMarket: (pda: string | null) => void;
  mode: Mode; setMode: (m: Mode) => void;
  replayClockMs: number; setReplayClockMs: (ms: number) => void;
  theme: Theme; setTheme: (t: Theme) => void;
}
export const useUiStore = create<UiState>((set) => ({
  selectedMarket: null, setSelectedMarket: (pda) => set({ selectedMarket: pda }),
  mode: "live", setMode: (mode) => set({ mode }),
  replayClockMs: 0, setReplayClockMs: (replayClockMs) => set({ replayClockMs }),
  // SSR renders the default "paper"; the no-flash script in layout + ThemeToggle
  // reconcile from localStorage/DOM on the client, so the store stays a plain default.
  theme: "paper",
  setTheme: (theme) => {
    if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("pm-theme", theme); } catch { /* ignore */ }
    }
    set({ theme });
  },
}));
