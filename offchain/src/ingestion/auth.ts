/**
 * Step 1 of the 4-step access flow: anonymous guest JWT.
 * POST /auth/guest/start  (no body)  ->  { token: <jwt> }   (ES256, ~30d expiry)
 */

interface TokenResponse {
  token: string;
}

/** Fetch a guest JWT. `base` is e.g. https://txline-dev.txodds.com or https://txline.txodds.com */
export async function getGuestJwt(base: string): Promise<string> {
  const res = await fetch(`${base}/auth/guest/start`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`/auth/guest/start failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as TokenResponse;
  if (!body?.token) throw new Error("guest/start returned no token");
  return body.token;
}
