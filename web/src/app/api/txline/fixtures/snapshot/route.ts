import { NextResponse } from "next/server";
import { buildMainnetFixturePreview } from "@/lib/mainnet-preview";
import { txlineFetch } from "@/lib/txline-fetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startEpochDay = Math.floor(Date.now() / 86_400_000);
    const fixtures = await txlineFetch(
      `/api/fixtures/snapshot?startEpochDay=${startEpochDay}&competitionId=72`,
      "mainnet"
    );
    if (!Array.isArray(fixtures)) {
      throw new Error("TxLINE fixtures snapshot did not return an array");
    }
    return NextResponse.json(buildMainnetFixturePreview(fixtures));
  } catch {
    return NextResponse.json(
      { error: "mainnet fixture preview unavailable" },
      { status: 503 }
    );
  }
}
