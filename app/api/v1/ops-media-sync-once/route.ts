import { NextRequest, NextResponse } from "next/server";
import { GET as runMediaSync } from "@/app/api/cron/media-sync/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ONE_TIME_TOKEN = "3ROcOMpCba_WSOkO5g6rM_43iEfDG7ZS6L9x4l3GFgI";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (token !== ONE_TIME_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const secret = String(process.env.CRON_SECRET || "");
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  const internalReq = new NextRequest(req.nextUrl, { headers: { authorization: `Bearer ${secret}` } });
  return runMediaSync(internalReq);
}
