import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { sql } from "drizzle-orm";
import pkg from "../../../package.json";
export const dynamic="force-dynamic";
export async function GET(){try{await db.select({probe:sql<number>`1`}).from(users).limit(1);return NextResponse.json({status:"healthy",database:"connected",version:pkg.version,timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}})}catch(error){console.error("Health check failed",error);return NextResponse.json({status:"degraded",database:"error",version:pkg.version,timestamp:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}})}}
