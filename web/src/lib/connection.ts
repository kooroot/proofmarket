import { Connection } from "@solana/web3.js";
let conn: Connection | null = null;
export function getConnection(): Connection {
  if (!conn) conn = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
  return conn;
}
