import { NextRequest, NextResponse } from "next/server";
import { txlineFetch, isNumericId } from "@/lib/txline-fetch";
export async function GET(_req: NextRequest, { params }: { params: { fixtureId: string } }) {
  if (!isNumericId(params.fixtureId)) return NextResponse.json({ error: "fixtureId must be numeric" }, { status: 400 });
  return NextResponse.json(await txlineFetch(`/api/odds/snapshot/${params.fixtureId}`));
}
