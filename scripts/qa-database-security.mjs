import fs from "node:fs";import path from "node:path";
const checks=[],check=(n,o,d="")=>checks.push({name:n,ok:Boolean(o),detail:d}),pkg=JSON.parse(fs.readFileSync("package.json","utf8")),migration=fs.readFileSync("scripts/harden-database-security.sql","utf8");
const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{})};
check("No browser Supabase database SDK dependency is installed",!Object.keys(deps).some(k=>k.startsWith("@supabase/")));
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules",".next",".git"].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|jsx)$/.test(e.name))files.push(p)}}walk("app");walk("components");walk("lib");
const clientFiles=files.filter(f=>{const s=fs.readFileSync(f,"utf8").trimStart();return s.startsWith('"use client"')||s.startsWith("'use client'")});
const secretLeaks=[];for(const f of clientFiles){const s=fs.readFileSync(f,"utf8");if(/DATABASE_URL|SUPABASE_SERVICE_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(s))secretLeaks.push(f)}
check("Client components contain no server database/service secrets",secretLeaks.length===0,secretLeaks.join(", "));
const directDb=[];for(const f of clientFiles){const s=fs.readFileSync(f,"utf8");if(/from\s+["']postgres["']|drizzle\(|@\/lib\/db/.test(s))directDb.push(f)}
check("Client components never import direct Postgres/Drizzle access",directDb.length===0,directDb.join(", "));
check("Database hardening migration is transaction wrapped",migration.includes("begin;")&&migration.includes("commit;"));
check("Campaign connection trigger search_path is fixed explicitly",migration.includes("alter function public.enforce_campaign_connection_scope()")&&migration.includes("set search_path = public, pg_temp"));
check("Database security migration fails closed before commit",migration.includes("raise exception 'Database security hardening failed"));
check("Database migration includes operator verification",migration.includes("mutable_search_path_functions"));
check("Database migration does not create permissive RLS policies",!migration.toLowerCase().includes("create policy"));
check("Database migration does not disable RLS",!migration.toLowerCase().includes("disable row level security"));
const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);console.log(`\n${checks.length-failed.length}/${checks.length} database architecture security checks passed.`);if(failed.length)process.exit(1);
