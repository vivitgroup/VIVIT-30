import postgres from "postgres";

const TARGET_BRANCH = "ops/oura-onboarding-20260828";
const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || "";

if (branch !== TARGET_BRANCH) {
  console.log(`[oura-ops] skipped on branch: ${branch || "unknown"}`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("[oura-ops] DATABASE_URL is not configured");

const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 5,
});

const deadline = new Date("2026-09-09T20:59:59.000Z");
const norm = (v) => String(v || "").trim().toLowerCase();

try {
  const result = await sql.begin(async (tx) => {
    // Security: VIVIT business tables are server-only. Keep RLS fail-closed; create no browser policies.
    await tx.unsafe("alter table if exists public.client_competitors enable row level security");
    await tx.unsafe("alter table if exists public.operational_tasks enable row level security");

    const rls = await tx`
      select c.relname as table_name, c.relrowsecurity as enabled
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('client_competitors','operational_tasks')
      order by c.relname`;
    if (rls.length !== 2 || rls.some((r) => !r.enabled)) throw new Error("RLS verification failed");

    const people = await tx`
      select id,name,email,role,is_active
      from public.users
      where is_active=true
        and (lower(name) in ('asmaa','omar','yosef','noha')
          or lower(email) in ('asmaa@vivitgroup.com','omar@vivitgroup.com','yosef@vivitgroup.com','noha@vivitgroup.com'))`;
    const person = (name) => people.find((p) => norm(p.name) === name || norm(p.email) === `${name}@vivitgroup.com`);
    const asmaa = person("asmaa"), omar = person("omar"), yosef = person("yosef"), noha = person("noha");
    if (!asmaa || !omar || !yosef || !noha) {
      throw new Error(`Required assignee missing: ${JSON.stringify({asmaa:!!asmaa,omar:!!omar,yosef:!!yosef,noha:!!noha})}`);
    }
    const [creator] = await tx`
      select id,name,email from public.users
      where is_active=true and role='SUPER_ADMIN'
      order by created_at asc limit 1`;
    if (!creator) throw new Error("No active SUPER_ADMIN available as task creator");

    const candidates = await tx`
      select id,company_name,monthly_retainer,media_budget,workspace_id
      from public.clients
      where is_active=true and lower(company_name) in ('oura shutter','shutter')
      order by case when lower(company_name)='oura shutter' then 0 else 1 end, created_at asc`;
    if (!candidates.length) throw new Error("Oura/Shutter client row not found");
    if (candidates.length > 1 && norm(candidates[0].company_name) !== 'oura shutter') {
      throw new Error(`Ambiguous client rows: ${candidates.map(c=>c.company_name).join(', ')}`);
    }
    const client = candidates[0];

    await tx`
      update public.clients set
        company_name='Oura Shutter',
        media_budget=20000,
        tasks_total=16,
        facebook_url='https://www.facebook.com/share/1LVr3h1vX5/?mibextid=wwXIfr',
        instagram_url='https://www.instagram.com/ourashutter?igsi=MWl1YnY2cWVxeHc1MA==',
        whatsapp_group_url='https://chat.whatsapp.com/JWhx8ooJ1lw1TvhPALIXGJ?s=cl&p=i&mlu=4',
        updated_at=now()
      where id=${client.id}`;

    const targets = [
      {type:'GRAPHIC', count:6, assignee:asmaa.id, prefix:'Oura Shutter — Static'},
      {type:'CAROUSEL', count:4, assignee:asmaa.id, prefix:'Oura Shutter — Carousel'},
      {type:'VIDEO_EDIT', count:4, assignee:omar.id, prefix:'Oura Shutter — Video'},
    ];
    const creativeSummary = {};
    for (const target of targets) {
      let rows = await tx`
        select id,title,status,created_at
        from public.creative_tasks
        where client_id=${client.id} and type=${target.type} and deleted_at is null
        order by created_at asc, id asc`;
      if (rows.length > target.count) {
        throw new Error(`${target.type} has ${rows.length} active tasks; target is ${target.count}. Refusing to guess which task to remove.`);
      }
      for (const row of rows) {
        const completed = target.type === 'GRAPHIC' || target.type === 'CAROUSEL';
        await tx`
          update public.creative_tasks set
            assigned_to_id=${target.assignee},
            deadline=${deadline},
            status=${completed ? 'COMPLETED' : row.status},
            completed_at=${completed ? new Date() : null},
            updated_at=now()
          where id=${row.id}`;
      }
      for (let i = rows.length + 1; i <= target.count; i++) {
        const completed = target.type === 'GRAPHIC' || target.type === 'CAROUSEL';
        await tx`
          insert into public.creative_tasks
            (workspace_id,client_id,title,brief,deadline,priority,status,type,created_by_id,assigned_to_id,completed_at,created_at,updated_at)
          values
            (${client.workspace_id || 'default'},${client.id},${`${target.prefix} ${String(i).padStart(2,'0')}`},
             ${completed ? 'Completed creative supplied by client; asset link pending storage upload.' : 'Oura Shutter video production task.'},
             ${deadline},'HIGH',${completed ? 'COMPLETED' : 'PENDING'},${target.type},${creator.id},${target.assignee},${completed ? new Date() : null},now(),now())`;
      }
      rows = await tx`
        select id,title,status from public.creative_tasks
        where client_id=${client.id} and type=${target.type} and deleted_at is null
        order by created_at asc,id asc`;
      creativeSummary[target.type] = rows.map((r)=>({title:r.title,status:r.status}));
    }

    const ensureOperational = async ({title,taskType,assignedTo,brief}) => {
      const existing = await tx`
        select id from public.operational_tasks
        where client_id=${client.id} and lower(title)=lower(${title})
        order by created_at asc limit 1`;
      if (existing[0]) {
        await tx`
          update public.operational_tasks set
            task_type=${taskType}, assigned_to_id=${assignedTo}, brief=${brief}, deadline=${deadline}, updated_at=now()
          where id=${existing[0].id}`;
        return existing[0].id;
      }
      const [inserted] = await tx`
        insert into public.operational_tasks
          (workspace_id,client_id,title,task_type,status,priority,assigned_to_id,brief,source_document,deadline,created_at,updated_at)
        values
          (${client.workspace_id || 'default'},${client.id},${title},${taskType},'PENDING','HIGH',${assignedTo},${brief},'Oura Shutter Master Plan.pdf',${deadline},now(),now())
        returning id`;
      return inserted.id;
    };

    await ensureOperational({
      title:'Oura Shutter — Content Plan', taskType:'CONTENT_PLAN', assignedTo:yosef.id,
      brief:'Create/manage the Oura Shutter content plan. Master plan deliverables: 4 carousels, 6 statics, 4 videos.'
    });
    await ensureOperational({
      title:'Oura Shutter — Media Buying', taskType:'MEDIA_BUYING', assignedTo:noha.id,
      brief:'Monthly media budget EGP 20,000. Planned split: Reach 4,000; Video/Engagement 5,000; Leads/Messages 8,000; Testing & Optimization 3,000.'
    });

    const counts = await tx`
      select type,status,count(*)::int as count
      from public.creative_tasks
      where client_id=${client.id} and deleted_at is null
      group by type,status order by type,status`;
    const ops = await tx`
      select title,task_type,status,deadline,assigned_to_id
      from public.operational_tasks where client_id=${client.id}
      order by created_at asc`;
    const [updatedClient] = await tx`
      select id,company_name,monthly_retainer,media_budget,tasks_total,facebook_url,instagram_url,whatsapp_group_url
      from public.clients where id=${client.id}`;

    return {client:updatedClient, rls, people:people.map(p=>({name:p.name,email:p.email,role:p.role})), counts, ops, creativeSummary};
  });

  console.log("[oura-ops] SUCCESS");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await sql.end({ timeout: 2 });
}
