import { NextRequest, NextResponse } from "next/server";
import { txlineFetch, isNumericId } from "@/lib/txline-fetch";
export async function GET(req: NextRequest, { params }: { params: { fixtureId: string } }) {
  const sp = req.nextUrl.searchParams;
  const seq = sp.get("seq"); const k1 = sp.get("statKey"); const k2 = sp.get("statKey2");
  if (!isNumericId(params.fixtureId) || !isNumericId(seq) || !isNumericId(k1) || (k2 !== null && !isNumericId(k2))) {
    return NextResponse.json({ error: "fixtureId, seq, statKey (and statKey2 if present) must be numeric" }, { status: 400 });
  }
  let q = `/api/scores/stat-validation?fixtureId=${params.fixtureId}&seq=${seq}&statKey=${k1}`;
  if (k2) q += `&statKey2=${k2}`;
  return NextResponse.json(await txlineFetch(q));
}
