import {
  BaseSignerWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletNotConnectedError,
  WalletReadyState,
  WalletSignTransactionError,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { isVersionedTransaction } from "@solana/wallet-adapter-base";
import type { TransactionOrVersionedTransaction } from "@solana/wallet-adapter-base";
import type { Keypair, PublicKey } from "@solana/web3.js";
import { loadOrCreateBurner } from "./burner";

export const BurnerWalletName = "ProofMarket Burner" as WalletName<"ProofMarket Burner">;

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f172a'/%3E%3Cpath d='M33 9c6 8 2 12 9 19 4 4 6 8 6 14 0 9-7 16-16 16S16 51 16 42c0-7 4-13 10-17-1 6 2 9 6 11 5-8-2-13 1-27z' fill='%2334d399'/%3E%3Cpath d='M31 39c4 5 0 8 0 13 4 0 8-4 8-9 0-4-2-7-8-12v8z' fill='%23f59e0b'/%3E%3C/svg%3E";

export class BurnerWalletAdapter extends BaseSignerWalletAdapter<"ProofMarket Burner"> {
  name = BurnerWalletName;
  url = "https://proofmarket-tan.vercel.app";
  icon = ICON;
  readyState = WalletReadyState.Loadable;
  supportedTransactionVersions = null;
  private keypair: Keypair | null = null;
  private isConnecting = false;

  get publicKey(): PublicKey | null {
    return this.keypair?.publicKey ?? null;
  }

  get connecting(): boolean {
    return this.isConnecting;
  }

  async connect(): Promise<void> {
    if (this.connected || this.isConnecting) return;
    this.isConnecting = true;
    try {
      this.keypair = loadOrCreateBurner();
      this.emit("connect", this.keypair.publicKey);
    } catch (error) {
      const walletError = new WalletConnectionError("Failed to load burner wallet", error);
      this.emit("error", walletError);
      throw walletError;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.keypair = null;
      this.emit("disconnect");
    } catch (error) {
      const walletError = new WalletDisconnectionError("Failed to disconnect burner wallet", error);
      this.emit("error", walletError);
      throw walletError;
    }
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this["supportedTransactionVersions"]>>(
    transaction: T
  ): Promise<T> {
    const keypair = this.keypair;
    if (!keypair) throw new WalletNotConnectedError("Burner wallet is not connected");

    try {
      if (isVersionedTransaction(transaction)) {
        transaction.sign([keypair]);
      } else {
        transaction.partialSign(keypair);
      }
      return transaction;
    } catch (error) {
      const walletError = new WalletSignTransactionError("Failed to sign with burner wallet", error);
      this.emit("error", walletError);
      throw walletError;
    }
  }
}
