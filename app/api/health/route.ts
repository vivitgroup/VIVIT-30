import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { sql } from "drizzle-orm";
import pkg from "../../../package.json";
export const dynamic="force-dynamic";

// Temporary production diagnostic: logs target metadata only, never credentials.
function sanitizedDbTarget() {
  try {
    const raw = process.env.DATABASE_URL;
    if (!raw) return { configured: false };
    const parsed = new URL(raw);
    return {
      configured: true,
      protocol: parsed.protocol,
      host: parsed.hostname,
      port: parsed.port || "5432",
      username: decodeURIComponent(parsed.username),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, "") || "postgres"),
    };
  } catch {
    return { configured: true, parseable: false };
  }
}

export async function GET(){
  try{
    await db.select({probe:sql<number>`1`}).from(users).limit(1);
    return NextResponse.json({status:"healthy",database:"connected",version:pkg.version,timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}})
  }catch(error){
    console.error("Health check failed", { error, dbTarget: sanitizedDbTarget() });
    return NextResponse.json({status:"degraded",database:"error",version:pkg.version,timestamp:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}})
  }
}
