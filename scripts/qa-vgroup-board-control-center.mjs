import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('app/group/command-center/page.tsx');
const api=read('app/api/vgroup/board/operations/route.ts');
const migration=read('db/migrations/20260902_board_control_center_v1.sql');
const checks=[
  ['board page is super-admin gated',/requireGroupSuperAdmin\(\)/.test(page)],
  ['consolidated finance snapshot is rendered',/board_finance_snapshot/.test(page)&&/Month revenue/.test(page)&&/YTD net/.test(page)],
  ['per-unit board drilldown exists',/Business-unit performance/.test(page)&&/marketing/.test(page)&&/hospitality/.test(page)&&/tech/.test(page)],
  ['board governance UI exists',/BOARD DECISIONS/.test(page)&&/BOARD ACTION TRACKER/.test(page)&&/BoardControls/.test(page)],
  ['board API is super-admin gated',/requireGroupSuperAdmin\(\)/.test(api)],
  ['board API is non-cacheable',/Cache-Control/.test(api)&&/no-store/.test(api)],
  ['decision lifecycle actions exist',/decision_create/.test(api)&&/decision_status/.test(api)],
  ['action-item lifecycle exists',/action_create/.test(api)&&/action_status/.test(api)],
  ['governance tables are RLS protected',/alter table vgroup\.board_decisions enable row level security/.test(migration)&&/alter table vgroup\.board_action_items enable row level security/.test(migration)],
  ['client roles are explicitly denied',/to anon, authenticated using \(false\)/.test(migration)],
  ['finance view is server-only',/revoke all on vgroup\.board_finance_snapshot from public, anon, authenticated/.test(migration)&&/grant select on vgroup\.board_finance_snapshot to service_role/.test(migration)],
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${name}`);
if(failed.length)process.exit(1);
console.log(`board-control-center: ${checks.length}/${checks.length} contracts verified`);
