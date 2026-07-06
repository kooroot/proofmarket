import { Connection, PublicKey } from "@solana/web3.js";

type Network = "devnet" | "mainnet";

interface Config {
  rpcUrl: string;
  apiOrigin: string;
  apiBaseUrl: string;
  programId: string;
  txlTokenMint: string;
  explorerCluster?: "devnet";
  freeServiceLevels: { id: number; label: string; latency: string }[];
}

const CONFIG: Record<Network, Config> = {
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    apiBaseUrl: "https://txline-dev.txodds.com/api",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    explorerCluster: "devnet",
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        latency: "60-second delay",
      },
    ],
  },
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    apiBaseUrl: "https://txline.txodds.com/api",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        latency: "60-second delay",
      },
      { id: 12, label: "World Cup & Int Friendlies", latency: "real-time" },
    ],
  },
};

function normalizeNetwork(value?: string): Network {
  const normalized = (value ?? "devnet").trim().toLowerCase();
  if (normalized === "" || normalized === "devnet") return "devnet";
  if (normalized === "mainnet") return "mainnet";
  throw new Error(`Unsupported --network "${value}". Use devnet or mainnet.`);
}

function apiUrl(cfg: Config, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${cfg.apiOrigin}${normalizedPath}`;
  }
  return `${cfg.apiBaseUrl}${normalizedPath}`;
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const network = normalizeNetwork(
    argValue("--network") ?? process.env.TXLINE_NETWORK
  );
  const cfg = CONFIG[network];
  const live = process.argv.includes("--live");
  const requireToken = process.argv.includes("--require-token");
  const path = argValue("--path") ?? "/api/fixtures/snapshot";
  const rpcUrl = process.env.TXLINE_RPC_URL ?? cfg.rpcUrl;

  console.log(`TxLINE ${network}`);
  console.log(`  RPC: ${rpcUrl}`);
  console.log(`  API: ${cfg.apiBaseUrl}`);
  console.log(`  Program: ${cfg.programId}`);
  console.log(`  TxL mint: ${cfg.txlTokenMint}`);
  console.log(
    `  Free World Cup service levels: ${cfg.freeServiceLevels
      .map((s) => `${s.id} (${s.latency})`)
      .join(", ")}`
  );

  if (!live) {
    console.log(
      "DRY-RUN: add --live to check the TxLINE program account and guest auth endpoint."
    );
    console.log(
      "For authenticated data, set TXLINE_JWT and TXLINE_API_TOKEN; add --require-token to fail if absent."
    );
    return;
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const program = await connection.getAccountInfo(new PublicKey(cfg.programId));
  if (!program?.executable)
    throw new Error(`TxLINE program not executable/found at ${cfg.programId}`);
  console.log(`  On-chain program: OK (${program.data.length} bytes)`);

  const guest = await fetch(`${cfg.apiOrigin}/auth/guest/start`, {
    method: "POST",
  });
  if (!guest.ok)
    throw new Error(`guest auth failed: ${guest.status} ${await guest.text()}`);
  const guestBody = (await guest.json()) as { token?: string };
  if (!guestBody.token) throw new Error("guest auth returned no token");
  console.log("  Guest auth: OK");

  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!jwt || !apiToken) {
    if (requireToken)
      throw new Error(
        "TXLINE_JWT and TXLINE_API_TOKEN are required with --require-token"
      );
    console.log(
      "  Authenticated data API: SKIPPED (missing TXLINE_JWT or TXLINE_API_TOKEN)"
    );
    return;
  }

  const data = await fetch(apiUrl(cfg, path), {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
      "Accept-Encoding": "gzip",
    },
  });
  if (!data.ok)
    throw new Error(`data API failed: ${data.status} ${await data.text()}`);
  console.log(`  Authenticated data API: OK (${apiUrl(cfg, path)})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
