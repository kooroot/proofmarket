import { NextRequest, NextResponse } from "next/server";
import { txlineFetch } from "@/lib/txline-fetch";
export async function GET(_req: NextRequest, { params }: { params: { fixtureId: string } }) {
  return NextResponse.json(await txlineFetch(`/api/scores/snapshot/${params.fixtureId}`));
}
