import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const checks=[];
const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
const read=p=>fs.readFileSync(p,"utf8");
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);

const perf=read("app/api/performance-score/route.ts");
const financePage=read("app/dashboard/finance/page.tsx");
const dbSource=read("lib/db.ts");
const agencyMigration=read("db/migrations/20260901_agency_health_workspace_period_unique.sql");
const commissionMigration=read("db/migrations/20260901_commissions_logical_uniqueness.sql");
const financeMigration=read("db/migrations/20260901_finance_invoice_period_uniqueness.sql");
const runtimeFiles=[...walk("app"),...walk("lib")].filter(f=>/\.(ts|tsx|js|mjs)$/.test(f));
const runtimeText=runtimeFiles.map(f=>`${f}\n${read(f)}`).join("\n");

check("Legacy client payment column p.outstanding is absent",!runtimeText.includes("p.outstanding"));
check("Legacy client_payment_profiles outstanding select is absent",!/client_payment_profiles[^;`\n]*\boutstanding\b/.test(runtimeText.replaceAll("amount_remaining outstanding","amount_remaining_alias")));
check("Agency health upsert is workspace-period scoped",perf.includes("on conflict (workspace_id,period)"));
check("Agency health migration fails closed on duplicates",agencyMigration.includes("HAVING COUNT(*) > 1")&&agencyMigration.includes("RAISE EXCEPTION"));
check("Agency health migration creates workspace-period uniqueness",agencyMigration.includes("CREATE UNIQUE INDEX")&&agencyMigration.includes("(workspace_id, period)"));
check("Commission insertion is conflict-safe",perf.includes("q.insert(commissions)")&&perf.includes(".onConflictDoNothing()"));
check("Commission migration fails closed on logical duplicates",commissionMigration.includes("HAVING COUNT(*) > 1")&&commissionMigration.includes("RAISE EXCEPTION"));
check("Commission migration includes nullable client in logical identity",commissionMigration.includes("COALESCE(client_id, '')")&&commissionMigration.includes("workspace_id, user_id, period, type"));
check("Invoice creation checks duplicate business period",financePage.includes("An invoice already exists for this client and period")&&financePage.includes("pg_advisory_xact_lock"));
check("Finance invoice migration fails closed on duplicates",financeMigration.includes("HAVING COUNT(*) > 1")&&financeMigration.includes("RAISE EXCEPTION"));
check("Finance invoice migration enforces workspace-client-period uniqueness",financeMigration.includes("CREATE UNIQUE INDEX")&&financeMigration.includes("workspace_id, client_id, year, month"));
check("Database URL parser preserves explicit username/password",dbSource.includes("decodeURIComponent(parsed.username)")&&dbSource.includes("decodeURIComponent(parsed.password)"));
check("Serverless database pool remains bounded",dbSource.includes("max:             3")&&dbSource.includes("prepare:         false"));

const url=String(process.env.DATABASE_URL||"").trim();
if(!url){check("Ephemeral PostgreSQL integration executed",false,"DATABASE_URL missing");}
else{
 const sql=postgres(url,{ssl:false,prepare:false,max:1});
 const testWorkspace="__db_audit__",testPeriod="2099-12",testUser="__db_audit_user__",testEmail="__db_audit_user__@example.invalid",testClient="__db_audit_client__";
 try{
   await sql`delete from commissions where workspace_id=${testWorkspace} and user_id=${testUser}`;
   await sql`delete from finance_records where workspace_id=${testWorkspace} and client_id=${testClient}`;
   await sql`delete from users where id=${testUser} or email=${testEmail}`;
   await sql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status) values(${testUser},${testWorkspace},'Database Audit Fixture',${testEmail},'not-a-real-password-hash','ACCOUNT_MANAGER',true,'APPROVED')`;

   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},1)`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},2)`;
   let agencyDuplicateBlocked=false;
   try{await sql.unsafe(agencyMigration);}catch(error){agencyDuplicateBlocked=String(error?.message||error).includes("duplicate (workspace_id, period)");}
   check("Agency migration refuses destructive implicit deduplication",agencyDuplicateBlocked);
   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   await sql.unsafe(agencyMigration);
   const agencyIndexes=await sql`select indexdef from pg_indexes where schemaname=current_schema() and tablename='agency_health_scores' and indexname='uq_agency_health_scores_workspace_period'`;
   check("Ephemeral DB has agency health unique index",agencyIndexes.length===1&&String(agencyIndexes[0]?.indexdef||"").includes("workspace_id")&&String(agencyIndexes[0]?.indexdef||"").includes("period"));
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},10)`;
   await sql`insert into agency_health_scores(id,workspace_id,period,overall_score) values(gen_random_uuid()::text,${testWorkspace},${testPeriod},20) on conflict (workspace_id,period) do update set overall_score=excluded.overall_score`;
   const agencyRows=await sql`select overall_score from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;
   check("Workspace-period upsert remains single-row and deterministic",agencyRows.length===1&&Number(agencyRows[0]?.overall_score)===20);
   await sql`delete from agency_health_scores where workspace_id=${testWorkspace} and period=${testPeriod}`;

   await sql`delete from commissions where workspace_id=${testWorkspace} and user_id=${testUser} and period=${testPeriod}`;
   await sql`insert into commissions(id,workspace_id,user_id,period,revenue_collected,commission_rate,commission_amount,type,client_id) values(gen_random_uuid()::text,${testWorkspace},${testUser},${testPeriod},'100',0.1,'10','ACCOUNT_MANAGER',null)`;
   await sql`insert into commissions(id,workspace_id,user_id,period,revenue_collected,commission_rate,commission_amount,type,client_id) values(gen_random_uuid()::text,${testWorkspace},${testUser},${testPeriod},'100',0.1,'10','ACCOUNT_MANAGER',null)`;
   let commissionDuplicateBlocked=false;
   try{await sql.unsafe(commissionMigration);}catch(error){commissionDuplicateBlocked=String(error?.message||error).includes("duplicate logical rows");}
   check("Commission migration refuses destructive implicit deduplication",commissionDuplicateBlocked);
   await sql`delete from commissions where workspace_id=${testWorkspace} and user_id=${testUser} and period=${testPeriod}`;
   await sql.unsafe(commissionMigration);
   const commissionIndexes=await sql`select indexdef from pg_indexes where schemaname=current_schema() and tablename='commissions' and indexname='uq_commissions_logical_identity'`;
   check("Ephemeral DB has commission logical unique index",commissionIndexes.length===1&&String(commissionIndexes[0]?.indexdef||"").includes("workspace_id")&&String(commissionIndexes[0]?.indexdef||"").includes("COALESCE"));
   await sql`insert into commissions(id,workspace_id,user_id,period,revenue_collected,commission_rate,commission_amount,type,client_id) values(gen_random_uuid()::text,${testWorkspace},${testUser},${testPeriod},'100',0.1,'10','ACCOUNT_MANAGER',null) on conflict do nothing`;
   await sql`insert into commissions(id,workspace_id,user_id,period,revenue_collected,commission_rate,commission_amount,type,client_id) values(gen_random_uuid()::text,${testWorkspace},${testUser},${testPeriod},'100',0.1,'10','ACCOUNT_MANAGER',null) on conflict do nothing`;
   const commissionRows=await sql`select id from commissions where workspace_id=${testWorkspace} and user_id=${testUser} and period=${testPeriod} and type='ACCOUNT_MANAGER' and client_id is null`;
   check("Repeated commission calculation is idempotent",commissionRows.length===1);

   await sql`delete from finance_records where workspace_id=${testWorkspace} and client_id=${testClient}`;
   await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding) values(gen_random_uuid()::text,${testWorkspace},${testClient},12,2099,100,0,100)`;
   let financeSchemaAlreadyBlocksDuplicates=false;
   try{await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding) values(gen_random_uuid()::text,${testWorkspace},${testClient},12,2099,200,0,200)`;}catch(error){financeSchemaAlreadyBlocksDuplicates=String(error?.code||"")==="23505";}
   let financeDuplicateBlocked=false;
   if(!financeSchemaAlreadyBlocksDuplicates){
     try{await sql.unsafe(financeMigration);}catch(error){financeDuplicateBlocked=String(error?.message||error).includes("duplicate invoice-period rows");}
   }
   check("Finance migration refuses destructive implicit deduplication",financeSchemaAlreadyBlocksDuplicates||financeDuplicateBlocked);
   await sql`delete from finance_records where workspace_id=${testWorkspace} and client_id=${testClient}`;
   await sql.unsafe(financeMigration);
   const financeIndexes=await sql`select indexdef from pg_indexes where schemaname=current_schema() and tablename='finance_records' and (indexname='uq_finance_records_workspace_client_period' or indexname='finance_records_workspace_client_year_month_unique')`;
   check("Ephemeral DB has invoice-period unique index",financeIndexes.length>=1&&financeIndexes.some(row=>String(row?.indexdef||"").includes("workspace_id")&&String(row?.indexdef||"").includes("client_id")&&String(row?.indexdef||"").includes("year")&&String(row?.indexdef||"").includes("month")));
   await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding) values(gen_random_uuid()::text,${testWorkspace},${testClient},12,2099,100,0,100)`;
   let secondInvoiceBlocked=false;
   try{await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding) values(gen_random_uuid()::text,${testWorkspace},${testClient},12,2099,200,0,200)`;}catch(error){secondInvoiceBlocked=String(error?.code||"")==="23505";}
   check("Database rejects duplicate invoice period",secondInvoiceBlocked);

   check("Ephemeral PostgreSQL integration executed",true);
 }catch(error){check("Ephemeral PostgreSQL integration executed",false,String(error?.message||error));}
 finally{
   try{await sql`delete from commissions where workspace_id=${testWorkspace} and user_id=${testUser}`;}catch{}
   try{await sql`delete from finance_records where workspace_id=${testWorkspace} and client_id=${testClient}`;}catch{}
   try{await sql`delete from agency_health_scores where workspace_id=${testWorkspace}`;}catch{}
   try{await sql`delete from users where id=${testUser} or email=${testEmail}`;}catch{}
   await sql.end({timeout:1});
 }
}

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);
console.log(`\n${checks.length-failed.length}/${checks.length} database/data-integrity checks passed.`);
if(failed.length)process.exit(1);
