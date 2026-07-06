import { Connection } from "@solana/web3.js";
import { getTxlineSettlementNetworkConfig } from "./txline-network";
let conn: Connection | null = null;
export function getConnection(): Connection {
  if (!conn)
    conn = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL ??
        getTxlineSettlementNetworkConfig().rpcUrl,
      "confirmed"
    );
  return conn;
}
