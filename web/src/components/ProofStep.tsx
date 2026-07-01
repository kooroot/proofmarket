"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
export function ProofStep({ idx, title, body, link, linkLabel, source, green }: { idx: number; title: string; body: React.ReactNode; link?: string; linkLabel?: string; source: string; green?: boolean }) {
  return (
    <motion.div data-step initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.12 }}>
      <Card className={`p-4 space-y-2 border ${green ? "border-emerald-500/60" : "border-zinc-800"}`}>
        <div className="text-xs text-zinc-500">Step {idx + 1}</div>
        <div className="font-medium">{title}</div>
        <div className="font-mono text-xs text-zinc-300 break-all">{body}</div>
        {link && <a className="text-emerald-400 text-sm" href={link}>{linkLabel} →</a>}
        <div className="text-[10px] text-zinc-600">source: {source}</div>
      </Card>
    </motion.div>
  );
}
