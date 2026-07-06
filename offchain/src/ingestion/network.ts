import type { SubscribeConfig } from "./subscribe.ts";

export type TxlineNetwork = "devnet" | "mainnet";

export interface TxlineServiceLevel {
  id: number;
  label: string;
  latency: "60-second delay" | "real-time";
}

export interface TxlineNetworkConfig {
  network: TxlineNetwork;
  rpcUrl: string;
  apiOrigin: string;
  apiBaseUrl: string;
  programId: string;
  txlTokenMint: string;
  explorerCluster?: "devnet";
  freeServiceLevels: readonly TxlineServiceLevel[];
}

const TXLINE_NETWORKS: Record<TxlineNetwork, TxlineNetworkConfig> = {
  devnet: {
    network: "devnet",
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
    network: "mainnet",
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

export function txlineApiUrl(path: string, network?: string | null): string {
  const cfg = getTxlineNetworkConfig(network);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${cfg.apiOrigin}${normalizedPath}`;
  }
  return `${cfg.apiBaseUrl}${normalizedPath}`;
}

export function txlineExplorerTx(sig: string, network?: string | null): string {
  const cfg = getTxlineNetworkConfig(network);
  const suffix = cfg.explorerCluster ? `?cluster=${cfg.explorerCluster}` : "";
  return `https://explorer.solana.com/tx/${sig}${suffix}`;
}

export function findTxlineNetworkByProgramId(
  programId: string
): TxlineNetwork | null {
  for (const [network, cfg] of Object.entries(TXLINE_NETWORKS) as Array<
    [TxlineNetwork, TxlineNetworkConfig]
  >) {
    if (cfg.programId === programId) return network;
  }
  return null;
}

export function subscribeConfigForNetwork(
  network?: string | null,
  opts: {
    serviceLevelId?: number;
    durationWeeks?: number;
    rpcUrl?: string;
    idlPath?: string;
  } = {}
): SubscribeConfig {
  const cfg = getTxlineNetworkConfig(network);
  return {
    rpcUrl: opts.rpcUrl ?? cfg.rpcUrl,
    programId: cfg.programId,
    txlMint: cfg.txlTokenMint,
    serviceLevelId: opts.serviceLevelId ?? cfg.freeServiceLevels[0].id,
    durationWeeks: opts.durationWeeks ?? 4,
    ...(opts.idlPath ? { idlPath: opts.idlPath } : {}),
  };
}
