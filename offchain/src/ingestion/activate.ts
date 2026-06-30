/**
 * Step 3 of the 4-step access flow: activate the on-chain subscription into an API token.
 *
 * The activation message binds payment (txSig) + intent (leagues) + session (jwt) and is
 * signed with the wallet's ed25519 key. Signing format is CONFIRMED verbatim from the
 * official example (findings §e):
 *
 *   messageString = `${txSig}:${leagues.join(",")}:${jwt}`
 *   walletSignature = base64( nacl.sign.detached(utf8(messageString), wallet.secretKey) )
 *
 * POST /api/token/activate { txSig, walletSignature, leagues }  + header Authorization: Bearer <jwt>
 *   -> 200 text/plain apiToken   (examples also tolerate { token } JSON — findings §G)
 */
import nacl from "tweetnacl";

/**
 * @param base   API base, e.g. https://oracle-dev.txodds.com
 * @param txSig  confirmed on-chain subscribe() signature
 * @param jwt    guest JWT from getGuestJwt()
 * @param leagues league IDs — MUST be the exact same array used in the on-chain intent
 * @param secretKey wallet ed25519 secret key (64 bytes, e.g. Keypair.secretKey)
 */
export async function activateToken(
  base: string,
  txSig: string,
  jwt: string,
  leagues: number[],
  secretKey: Uint8Array,
): Promise<string> {
  // EXACT message binding — order and separators matter; server recomputes & verifies.
  const messageString = `${txSig}:${leagues.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const res = await fetch(`${base}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ txSig, walletSignature, leagues }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`/api/token/activate failed: ${res.status} ${text}`);
  }

  // Documented as text/plain, but tolerate a { token } JSON wrapper (findings §G).
  try {
    const parsed = JSON.parse(text) as { token?: string };
    if (parsed?.token) return parsed.token;
  } catch {
    /* not JSON — fall through to raw text */
  }
  const apiToken = text.trim();
  if (!apiToken) throw new Error("activate returned an empty API token");
  return apiToken;
}
