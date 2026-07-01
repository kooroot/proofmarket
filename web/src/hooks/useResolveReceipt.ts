"use client";
import { useQuery } from "@tanstack/react-query";
import { BorshEventCoder, type Idl } from "@coral-xyz/anchor";
import idl from "@/idl/proofmarket.json";
import { getConnection } from "@/lib/connection";
import { parseValidateStatResult } from "@/lib/validate-result";
export function useResolveReceipt(sig: string | undefined) {
  return useQuery({
    enabled: !!sig,
    queryKey: ["receipt", sig],
    queryFn: async () => {
      const tx = await getConnection().getTransaction(sig!, { maxSupportedTransactionVersion: 0 });
      const logs = tx?.meta?.logMessages ?? [];
      const coder = new BorshEventCoder(idl as Idl);
      let resolved: Record<string, unknown> | null = null;
      for (const l of logs) {
        const m = l.startsWith("Program data: ") ? coder.decode(l.slice("Program data: ".length)) : null;
        if (m?.name === "marketResolved") resolved = m.data; // §4.12: inner log keyed to 6pW64g…, NOT tx.meta.returnData
      }
      return { resolved, validate: parseValidateStatResult(logs) };
    },
  });
}
