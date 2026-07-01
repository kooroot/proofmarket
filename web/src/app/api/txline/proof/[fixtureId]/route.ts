import { NextRequest, NextResponse } from "next/server";
import { txlineFetch } from "@/lib/txline-fetch";
export async function GET(req: NextRequest, { params }: { params: { fixtureId: string } }) {
  const sp = req.nextUrl.searchParams;
  const seq = sp.get("seq"); const k1 = sp.get("statKey"); const k2 = sp.get("statKey2");
  let q = `/api/scores/stat-validation?fixtureId=${params.fixtureId}&seq=${seq}&statKey=${k1}`;
  if (k2) q += `&statKey2=${k2}`;
  return NextResponse.json(await txlineFetch(q));
}
