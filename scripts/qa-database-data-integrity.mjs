import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const checks=[];
const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
const read=p=>fs.readFileSync(p,"utf8");
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);

const perf=read("app/api/performance-score/route.ts");
const dbSource=read("lib/db.ts");
const migrationPath="db/migrations/20260901_agency_health_workspace_period_unique.sql";
const migration=read(migrationPath);
const runtimeFiles=[...walk("app"),...walk("lib")].filter(f=>/\.(ts|tsx|js|mjs)$/.test(f));
const runtimeText=runtimeFiles.map(f=>`${f}\n${read(f)}`).join("\n");

check("Legacy client payment column p.outstanding is absent",!runtimeText.includes("p.outstanding"));
check("Legacy client_payment_profiles outstanding select is absent",!/client_payment_profiles[^;`\n]*\boutstanding\b/.test(runtimeText.replaceAll("amount_remaining outstanding","amount_remaining_alias")));
check("Agency health upsert is workspace-period scoped",perf.includes("on conflict (workspace_id,period)"));
check("Agency health migration fails closed on duplicates",migration.includes("HAVING COUNT(*) > 1")&&migration.includes("RAISE EXCEPTION"));
check("Agency health migration creates workspace-period uniqueness",migration.includes("CREATE UNIQUE INDEX")&&migration.includes("(workspace_id, period)"));
check("Database URL parser preserves explicit username/password",dbSource.includes("decodeURIComponent(parsed.username)")&&dbSource.includes("decodeURIComponent(parsed.password)"));
check("Serverless database pool remains bounded",dbSource.includes("max:             3")&&dbSource.includes("prepare:         false"));

const url=String(process.env.DATABASE_URL||"").trim();
if(!url){check("Ephemeral PostgreSQL integration executed",false,"DATABASE_URL missing");}
else{
 const sql=postgres(url,{ssl:false,prepare:false,max:1});
 try{
   const testWorkspace="__db_audit__",testPeriod="2099-12";
   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},1)`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},2)`;
   let duplicateBlocked=false;
   try{await sql.unsafe(migration);}catch(error){duplicateBlocked=String(error?.message||error).includes("duplicate (workspace_id, period)");}
   check("Migration refuses destructive implicit deduplication",duplicateBlocked);
   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   await sql.unsafe(migration);
   const indexes=await sql`select indexdef from pg_indexes where schemaname=current_schema() and tablename='agency_health_scores' and indexname='uq_agency_health_scores_workspace_period'`;
   check("Ephemeral DB has agency health unique index",indexes.length===1&&String(indexes[0]?.indexdef||"").includes("workspace_id")&&String(indexes[0]?.indexdef||"").includes("period"));
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},10)`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},20) on conflict (workspace_id,period) do update set overall_score=excluded.overall_score`;
   const rows=await sql`select overall_score from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   check("Workspace-period upsert remains single-row and deterministic",rows.length===1&&Number(rows[0]?.overall_score)===20);
   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   check("Ephemeral PostgreSQL integration executed",true);
 }catch(error){check("Ephemeral PostgreSQL integration executed",false,String(error?.message||error));}
 finally{await sql.end({timeout:1});}
}

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);
console.log(`\n${checks.length-failed.length}/${checks.length} database/data-integrity checks passed.`);
if(failed.length)process.exit(1);
