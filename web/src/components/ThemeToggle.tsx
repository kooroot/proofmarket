"use client";

import { useEffect } from "react";
import { useUiStore, type Theme } from "@/store/ui";

/**
 * Paper/Terminal theme switch for the masthead. The applied theme is already on
 * <html data-theme> before paint (no-flash script in layout.tsx); on mount we
 * reconcile the zustand store to whatever the DOM/localStorage settled on so the
 * control shows the correct active side.
 */
export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  useEffect(() => {
    const applied = (document.documentElement.dataset.theme as Theme) || "paper";
    if (applied !== theme) useUiStore.setState({ theme: applied });
    // sync once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seg = (t: Theme, label: string) => {
    const active = theme === t;
    return (
      <button
        type="button"
        onClick={() => setTheme(t)}
        aria-pressed={active}
        className={`px-2 py-[5px] font-mono text-[10.5px] tracking-wide transition-colors ${
          active ? "bg-ink text-paper" : "bg-transparent text-ink-2 hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="inline-flex overflow-hidden rounded-[3px] border border-rule-2"
      role="group"
      aria-label="Theme"
      title="Switch paper / terminal theme"
    >
      {seg("paper", "PAPER")}
      {seg("terminal", "TERMINAL")}
    </div>
  );
}
