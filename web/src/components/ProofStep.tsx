"use client";
import { motion } from "framer-motion";

/** Truncated-hex chip for a 32-byte root. Color-coded so the SAME hash is recognizable
 *  when it reappears as the input of the next fold — that chaining is the whole point. */
export function HashChip({ bytes, tone, prefix }: { bytes: number[]; tone: "sky" | "violet" | "fuchsia" | "emerald"; prefix?: string }) {
  const tones = {
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    fuchsia: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  } as const;
  const hex = bytes.slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${tones[tone]}`}>
      {prefix && <span className="opacity-70">{prefix}</span>}#{hex}{bytes.length > 5 && "…"}
    </span>
  );
}

/** One node of the resolution walk: numbered rail dot + card. Rendered inside
 *  ProofChain's two-column grid (rail | content). */
export function ProofStep({ idx, title, subtitle, body, link, linkLabel, source, green, last }: {
  idx: number; title: string; subtitle: string; body?: React.ReactNode;
  link?: string; linkLabel?: string; source: string; green?: boolean; last?: boolean;
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.24 }}
        className="flex flex-col items-center pt-4">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
          green ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" : "border-zinc-600 bg-zinc-900 text-zinc-300"}`}>
          {green ? "✓" : idx + 1}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-zinc-800" />}
      </motion.div>
      <motion.div data-step initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.24 }}
        className={`rounded-lg border p-3 sm:p-4 space-y-1.5 bg-zinc-900/60 ${green ? "border-emerald-500/60" : "border-zinc-800"}`}>
        <div className="font-medium leading-tight">{title}</div>
        <div className="text-xs text-zinc-400">{subtitle}</div>
        {body && <div className="font-mono text-xs text-zinc-300 break-words leading-relaxed">{body}</div>}
        {link && <a className="text-emerald-400 text-xs" href={link} target="_blank" rel="noreferrer">{linkLabel} →</a>}
        <div className="text-[10px] text-zinc-600">source: {source}</div>
      </motion.div>
    </>
  );
}

/** The transformation between two nodes: an animated vertical line in the rail column
 *  plus the fold/CPI label — output of the node above is the input of the node below. */
export function FoldConnector({ idx, label }: { idx: number; label: React.ReactNode }) {
  return (
    <>
      <div className="flex justify-center">
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: idx * 0.24 + 0.12, duration: 0.25 }}
          className="w-px self-stretch min-h-8 bg-gradient-to-b from-zinc-500 to-zinc-700 origin-top" />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.24 + 0.2 }}
        className="flex items-center py-1.5 font-mono text-[11px] text-zinc-500">
        <span className="mr-1.5 text-zinc-600">↓</span>{label}
      </motion.div>
    </>
  );
}
