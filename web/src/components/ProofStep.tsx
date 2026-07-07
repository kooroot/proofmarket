"use client";
import { motion } from "framer-motion";

/** Truncated-hex chip for a 32-byte root. Color-coded so the SAME hash is recognizable
 *  when it reappears as the input of the next fold — that chaining is the whole point. */
export function HashChip({ bytes, tone, prefix }: { bytes: number[]; tone: "sky" | "violet" | "fuchsia" | "emerald"; prefix?: string }) {
  const tones = {
    sky: "border-sky text-sky",
    violet: "border-violet text-violet",
    fuchsia: "border-fuchsia text-fuchsia",
    emerald: "border-proof text-proof",
  } as const;
  const hex = bytes.slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
  return (
    <span className={`inline-flex max-w-full items-center gap-1 overflow-hidden rounded-[3px] border px-1.5 py-0.5 align-middle font-mono text-[11px] ${tones[tone]}`}>
      {prefix && <span className="max-w-[7rem] truncate opacity-70 sm:max-w-none">{prefix}</span>}#{hex}{bytes.length > 5 && "…"}
    </span>
  );
}

/** One node of the resolution walk: numbered rail dot + content block. Rendered inside
 *  ProofChain's two-column grid (rail | content). */
export function ProofStep({ idx, title, subtitle, body, link, linkLabel, source, green, last }: {
  idx: number; title: string; subtitle: string; body?: React.ReactNode;
  link?: string; linkLabel?: string; source: string; green?: boolean; last?: boolean;
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.24 }}
        className="flex flex-col items-center pt-4">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] font-semibold sm:h-7 sm:w-7 ${
          green ? "border-proof bg-proof-soft text-proof" : "border-rule-2 bg-panel text-ink-2"}`}>
          {green ? "✓" : idx + 1}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-rule" />}
      </motion.div>
      <motion.div data-step initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.24 }}
        className="min-w-0 space-y-1.5 pb-4">
        <div className="font-semibold leading-[1.3] text-ink">{title}</div>
        <div className="text-[12.5px] leading-[1.5] text-ink-2">{subtitle}</div>
        {body && <div className="min-w-0 overflow-x-auto font-mono text-[11px] leading-relaxed text-ink [-webkit-overflow-scrolling:touch]">{body}</div>}
        {link && <a className="block break-words font-mono text-[11px] text-proof underline" href={link} target="_blank" rel="noreferrer">{linkLabel} →</a>}
        <div className="break-all font-mono text-[10px] text-ink-2 opacity-85">source: {source}</div>
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
          className="min-h-8 w-px origin-top self-stretch bg-gradient-to-b from-rule-2 to-rule" />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.24 + 0.2 }}
        className="flex min-w-0 items-center overflow-x-auto whitespace-nowrap py-1.5 font-mono text-[11px] text-ink-2 [-webkit-overflow-scrolling:touch]">
        <span className="mr-1.5 opacity-70">↓</span>{label}
      </motion.div>
    </>
  );
}
