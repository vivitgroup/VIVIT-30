import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { sql } from "drizzle-orm";
import pkg from "../../../package.json";
export const dynamic="force-dynamic";
export async function GET(){try{const [{count}]=await db.select({count:sql<number>`count(*)::int`}).from(users);return NextResponse.json({status:"healthy",database:"connected",users:Number(count||0),version:pkg.version,timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}})}catch(error){console.error("Health check failed",error);return NextResponse.json({status:"degraded",database:"error",version:pkg.version,timestamp:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}})}}
