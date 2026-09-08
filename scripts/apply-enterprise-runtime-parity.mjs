import fs from "node:fs/promises";
import postgres from "postgres";

const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL is required");
const sql=postgres(url,{ssl:false,max:1,prepare:false});
try{
  const migration=await fs.readFile("drizzle/20260909_enterprise_runtime_parity.sql","utf8");
  await sql.unsafe(migration);
  console.log("Enterprise runtime parity migration applied");
}finally{
  await sql.end();
}
