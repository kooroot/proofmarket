import { PublicKey } from "@solana/web3.js";

export type TxlineNetwork = "devnet" | "mainnet";

export interface TxlineServiceLevel {
  id: number;
  label: string;
  note: string;
}

export interface TxlineNetworkConfig {
  network: TxlineNetwork;
  rpcUrl: string;
  apiOrigin: string;
  apiBaseUrl: string;
  programId: PublicKey;
  txlTokenMint: PublicKey;
  explorerCluster?: "devnet";
  freeServiceLevels: readonly TxlineServiceLevel[];
}

const TXLINE_NETWORKS: Record<TxlineNetwork, TxlineNetworkConfig> = {
  devnet: {
    network: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    apiBaseUrl: "https://txline-dev.txodds.com/api",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
    explorerCluster: "devnet",
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        note: "pricing matrix authoritative; odds stream sampling corrected to 0s",
      },
    ],
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    apiBaseUrl: "https://txline.txodds.com/api",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
    freeServiceLevels: [
      {
        id: 1,
        label: "World Cup & Int Friendlies",
        note: "pricing matrix authoritative; do not trust obsolete IDL delay text",
      },
      {
        id: 12,
        label: "World Cup & Int Friendlies",
        note: "pricing matrix authoritative; odds stream sampling corrected to 0s",
      },
    ],
  },
};

export function normalizeTxlineNetwork(value?: string | null): TxlineNetwork {
  const normalized = (value ?? "devnet").trim().toLowerCase();
  if (normalized === "" || normalized === "devnet") return "devnet";
  if (normalized === "mainnet") return "mainnet";
  throw new Error(
    `Unsupported TXLINE_NETWORK "${value}". Use "devnet" or "mainnet".`
  );
}

export function getTxlineNetworkConfig(
  network?: string | null
): TxlineNetworkConfig {
  return TXLINE_NETWORKS[normalizeTxlineNetwork(network)];
}

export function getTxlineDataNetworkConfig(): TxlineNetworkConfig {
  return getTxlineNetworkConfig(
    process.env.TXLINE_NETWORK ?? process.env.NEXT_PUBLIC_TXLINE_NETWORK
  );
}

export function getTxlineSettlementNetworkConfig(
  network?: string | null
): TxlineNetworkConfig {
  return getTxlineNetworkConfig(
    network ?? process.env.NEXT_PUBLIC_SETTLEMENT_TXLINE_NETWORK
  );
}

export function txlineApiUrl(path: string, network?: string | null): string {
  const cfg =
    network === undefined
      ? getTxlineDataNetworkConfig()
      : getTxlineNetworkConfig(network);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${cfg.apiOrigin}${normalizedPath}`;
  }
  return `${cfg.apiBaseUrl}${normalizedPath}`;
}

export function explorerTxForNetwork(
  sig: string,
  network?: string | null
): string {
  const cfg = getTxlineNetworkConfig(network);
  const suffix = cfg.explorerCluster ? `?cluster=${cfg.explorerCluster}` : "";
  return `https://explorer.solana.com/tx/${sig}${suffix}`;
}

export function explorerAddrForNetwork(
  addr: string,
  network?: string | null
): string {
  const cfg = getTxlineNetworkConfig(network);
  const suffix = cfg.explorerCluster ? `?cluster=${cfg.explorerCluster}` : "";
  return `https://explorer.solana.com/address/${addr}${suffix}`;
}

export function assertTxlineNetworkBundle(input: {
  network?: string | null;
  apiOrigin?: string;
  programId?: string;
  rpcUrl?: string;
}): void {
  const cfg = getTxlineNetworkConfig(input.network);
  if (input.apiOrigin && new URL(input.apiOrigin).origin !== cfg.apiOrigin) {
    throw new Error(
      `TxLINE ${cfg.network} must use API origin ${cfg.apiOrigin}`
    );
  }
  if (input.programId && input.programId !== cfg.programId.toBase58()) {
    throw new Error(
      `TxLINE ${cfg.network} must use program ${cfg.programId.toBase58()}`
    );
  }
  if (input.rpcUrl) {
    const rpc = input.rpcUrl.toLowerCase();
    if (cfg.network === "devnet" && rpc.includes("mainnet")) {
      throw new Error("TxLINE devnet cannot be paired with a mainnet RPC URL");
    }
    if (cfg.network === "mainnet" && rpc.includes("devnet")) {
      throw new Error("TxLINE mainnet cannot be paired with a devnet RPC URL");
    }
  }
}
