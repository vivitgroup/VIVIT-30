import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { sql } from "drizzle-orm";
export const dynamic="force-dynamic";
export async function GET(){try{await db.select({probe:sql<number>`1`}).from(users).limit(1);return NextResponse.json({status:"healthy"},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}catch(error){console.error("Health check failed",error instanceof Error?error.name:"health_failure");return NextResponse.json({status:"degraded"},{status:503,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}}
