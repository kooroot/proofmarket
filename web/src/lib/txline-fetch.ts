const BASE = "https://txline-dev.txodds.com";
export function buildHeaders(jwt: string, apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken, "Accept-Encoding": "gzip" };
}
export async function txlineFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: buildHeaders(process.env.TXLINE_JWT!, process.env.TXLINE_API_TOKEN!), cache: "no-store" });
  if (!res.ok) throw new Error(`txline ${res.status} ${path}`);
  return res.json();
}
