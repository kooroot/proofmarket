const BASE = "https://txline-dev.txodds.com";
export function buildHeaders(jwt: string, apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken, "Accept-Encoding": "gzip" };
}
/** TxODDS fixture / seq / statKey ids are always plain non-negative integers. Reject anything else
 *  (null, empty, `&`, `/`, `..`, whitespace, `1e3`, `-5`) so it can never alter the upstream path/query. */
export function isNumericId(s: string | null): s is string {
  return s !== null && /^\d+$/.test(s);
}
export async function txlineFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: buildHeaders(process.env.TXLINE_JWT!, process.env.TXLINE_API_TOKEN!), cache: "no-store" });
  if (!res.ok) throw new Error(`txline ${res.status} ${path}`);
  return res.json();
}
