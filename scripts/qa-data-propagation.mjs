import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = postgres(url, { max: 1, prepare: false });
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const a = {
  workspace: `qa-prop-a-${suffix}`,
  user: `qa-user-a-${suffix}`,
  client: `qa-client-a-${suffix}`,
  task: `qa-task-a-${suffix}`,
  campaign: `qa-campaign-a-${suffix}`,
  perf: `qa-perf-a-${suffix}`,
};
const b = {
  workspace: `qa-prop-b-${suffix}`,
  user: `qa-user-b-${suffix}`,
  client: `qa-client-b-${suffix}`,
};

function assert(condition, message) {
  if (!condition) throw new Error(`DATA_PROPAGATION_FAIL: ${message}`);
}

try {
  await sql.begin(async (tx) => {
    await tx`insert into workspaces(id,name,slug) values
      (${a.workspace},'QA Propagation A',${`qa-prop-a-${suffix}`}),
      (${b.workspace},'QA Propagation B',${`qa-prop-b-${suffix}`})`;

    await tx`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status) values
      (${a.user},${a.workspace},'QA User A',${`qa-a-${suffix}@example.test`},'not-a-real-login','SUPER_ADMIN',true,'APPROVED'),
      (${b.user},${b.workspace},'QA User B',${`qa-b-${suffix}@example.test`},'not-a-real-login','SUPER_ADMIN',true,'APPROVED')`;

    await tx`insert into clients(id,workspace_id,company_name,is_active) values
      (${a.client},${a.workspace},'QA Client A',true),
      (${b.client},${b.workspace},'QA Client B',true)`;

    // Intentionally send the wrong/default workspace. The DB propagation guard must
    // derive the authoritative workspace from the client.
    await tx`insert into creative_tasks(
      id,workspace_id,client_id,title,brief,deadline,priority,status,type,created_by_id
    ) values (
      ${a.task},'default',${a.client},'QA Propagation Task','Propagation verification',now() + interval '2 days','HIGH','PENDING','GRAPHIC',${a.user}
    )`;

    await tx`insert into ad_campaigns(
      id,workspace_id,client_id,platform,external_id,name,objective,status,created_by
    ) values (
      ${a.campaign},'default',${a.client},'META',${`qa-ext-${suffix}`},'QA Propagation Campaign','LEADS','ACTIVE',${a.user}
    )`;

    await tx`insert into ad_performance_daily(
      id,campaign_id,date,breakdown_type,breakdown_value,spend,impressions,reach,clicks,results,purchases,revenue
    ) values (
      ${a.perf},${a.campaign},date_trunc('day',now()),'TOTAL','ALL',125,10000,8000,240,12,3,900
    )`;

    const [task] = await tx`select workspace_id,client_id,status from creative_tasks where id=${a.task}`;
    assert(task?.workspace_id === a.workspace, 'creative task did not inherit the client workspace');
    assert(task?.client_id === a.client, 'creative task lost its client relation');

    const taskViewA = await tx`select t.id from creative_tasks t join clients c on c.id=t.client_id
      where t.workspace_id=${a.workspace} and c.workspace_id=${a.workspace} and c.is_active=true
        and t.client_id=${a.client} and t.status not in ('COMPLETED','REJECTED')`;
    const taskViewB = await tx`select t.id from creative_tasks t join clients c on c.id=t.client_id
      where t.workspace_id=${b.workspace} and c.workspace_id=${b.workspace} and c.is_active=true
        and t.id=${a.task}`;
    assert(taskViewA.some((r) => r.id === a.task), 'task is not visible in its intended workspace/client views');
    assert(taskViewB.length === 0, 'task leaked into a different workspace');

    const [campaign] = await tx`select workspace_id,client_id,status from ad_campaigns where id=${a.campaign}`;
    assert(campaign?.workspace_id === a.workspace, 'campaign did not inherit the client workspace');
    assert(campaign?.client_id === a.client, 'campaign lost its client relation');

    const campaignViewA = await tx`select a.id,coalesce(sum(p.spend),0)::float8 spend,coalesce(sum(p.results),0)::int results
      from ad_campaigns a
      join clients c on c.id=a.client_id
      left join ad_performance_daily p on p.campaign_id=a.id and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null
      where a.workspace_id=${a.workspace} and c.workspace_id=${a.workspace} and a.client_id=${a.client}
      group by a.id`;
    const campaignViewB = await tx`select a.id from ad_campaigns a join clients c on c.id=a.client_id
      where a.workspace_id=${b.workspace} and c.workspace_id=${b.workspace} and a.id=${a.campaign}`;
    assert(campaignViewA.length === 1, 'campaign is not visible in its intended workspace/client views');
    assert(Number(campaignViewA[0].spend) === 125, 'campaign spend did not propagate from performance data');
    assert(Number(campaignViewA[0].results) === 12, 'campaign results did not propagate from performance data');
    assert(campaignViewB.length === 0, 'campaign leaked into a different workspace');

    await tx`delete from ad_performance_daily where id=${a.perf}`;
    await tx`delete from ad_campaigns where id=${a.campaign}`;
    await tx`delete from creative_tasks where id=${a.task}`;
    await tx`delete from clients where id in (${a.client},${b.client})`;
    await tx`delete from users where id in (${a.user},${b.user})`;
    await tx`delete from workspaces where id in (${a.workspace},${b.workspace})`;
  });

  console.log('DATA_PROPAGATION_PASS: task and campaign writes/readbacks stay workspace-scoped and performance metrics propagate.');
} finally {
  await sql.end({ timeout: 5 });
}
