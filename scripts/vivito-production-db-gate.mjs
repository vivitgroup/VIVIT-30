import fs from 'node:fs/promises';
import postgres from 'postgres';

const mode = String(process.env.VIVITO_PROD_DB_MODE || 'CHECK').toUpperCase();
const databaseUrl = process.env.PROD_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('PROD_DATABASE_URL is required. No database credentials are stored in the repository.');
}
if (!['CHECK', 'APPLY'].includes(mode)) {
  throw new Error(`Unsupported VIVITO_PROD_DB_MODE: ${mode}`);
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
  throw new Error('PROD_DATABASE_URL must use postgres:// or postgresql://');
}
const connection = {
  host: parsedDatabaseUrl.hostname,
  port: parsedDatabaseUrl.port ? Number(parsedDatabaseUrl.port) : 5432,
  database: decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//, '') || 'postgres'),
  username: decodeURIComponent(parsedDatabaseUrl.username),
  password: decodeURIComponent(parsedDatabaseUrl.password),
};
if (!connection.host || !connection.username || !connection.password) {
  throw new Error('PROD_DATABASE_URL is missing host, username, or password.');
}

const sql = postgres(connection, {
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false,
});

const migrationFiles = [
  'db/migrations/20260828_vivito_direct_operator.sql',
  'db/migrations/20260828_vivito_direct_operator_v2.sql',
  'db/migrations/20260828_vivito_enterprise_governance.sql',
  'db/migrations/20260828_vivito_gap_closure.sql',
];

async function preflight() {
  const rows = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('users','workspaces','clients')
    order by table_name
  `;
  const names = new Set(rows.map((r) => r.table_name));
  for (const required of ['users', 'workspaces', 'clients']) {
    if (!names.has(required)) throw new Error(`Production preflight failed: missing baseline table public.${required}`);
  }
  console.log('Production DB preflight: PASS');
}

async function applyMigrations() {
  for (const file of migrationFiles) {
    const body = await fs.readFile(file, 'utf8');
    if (!/\bbegin\s*;/i.test(body) || !/\bcommit\s*;/i.test(body)) {
      throw new Error(`Refusing migration without explicit transaction markers: ${file}`);
    }
    // postgres.js rejects transaction control embedded in sql.unsafe(). The migration
    // files are already guarded by explicit BEGIN/COMMIT markers, so strip only those
    // outer markers and let sql.begin() own the transaction on the single connection.
    const statements = body
      .replace(/^\s*begin\s*;\s*/i, '')
      .replace(/\s*commit\s*;\s*$/i, '');
    console.log(`Applying controlled migration: ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
    });
  }
}

async function readback() {
  const tables = await sql`
    select tablename, rowsecurity from pg_tables
    where schemaname = 'public' and tablename in (
      'vivito_autonomy_events','vivito_approval_events','vivito_decision_journal',
      'vivito_escalations','vivito_resource_usage','vivito_notification_dedupe',
      'vivito_security_events','client_competitors','operational_tasks'
    ) order by tablename
  `;
  const requiredTables = new Set([
    'vivito_autonomy_events','vivito_approval_events','vivito_decision_journal',
    'vivito_escalations','vivito_resource_usage','vivito_notification_dedupe','vivito_security_events'
  ]);
  const seen = new Set(tables.map((r) => r.tablename));
  for (const name of requiredTables) if (!seen.has(name)) throw new Error(`Production readback failed: missing public.${name}`);
  for (const row of tables) {
    if (['vivito_approval_events','vivito_decision_journal','vivito_escalations','vivito_resource_usage','vivito_notification_dedupe','vivito_security_events','client_competitors','operational_tasks'].includes(row.tablename) && row.rowsecurity !== true) {
      throw new Error(`Production readback failed: RLS is not enabled on public.${row.tablename}`);
    }
  }

  const columns = await sql`
    select table_name, column_name from information_schema.columns
    where table_schema='public' and (
      (table_name='vivito_autonomy_events' and column_name in (
        'retry_count','next_retry_at','evidence_quality','decision_route','simulation','policy_version','decision_version','learning_fingerprint','rollback_of_event_id','rolled_back_at','rolled_back_by','rollback_result'
      )) or (table_name='vivito_backup_manifests' and column_name in (
        'format_version','verified_checksum','restore_record_counts','verification_details'
      ))
    )
  `;
  const columnSet = new Set(columns.map((r) => `${r.table_name}.${r.column_name}`));
  for (const col of [
    'vivito_autonomy_events.retry_count','vivito_autonomy_events.next_retry_at','vivito_autonomy_events.evidence_quality','vivito_autonomy_events.decision_route','vivito_autonomy_events.simulation','vivito_autonomy_events.policy_version','vivito_autonomy_events.decision_version','vivito_autonomy_events.learning_fingerprint','vivito_autonomy_events.rollback_of_event_id','vivito_autonomy_events.rolled_back_at','vivito_autonomy_events.rolled_back_by','vivito_autonomy_events.rollback_result','vivito_backup_manifests.format_version','vivito_backup_manifests.verified_checksum','vivito_backup_manifests.restore_record_counts','vivito_backup_manifests.verification_details'
  ]) if (!columnSet.has(col)) throw new Error(`Production readback failed: missing ${col}`);

  const indexes = await sql`
    select indexname from pg_indexes where schemaname='public' and indexname in (
      'uq_vivito_event_workspace_idempotency','uq_vivito_checkpoint_run_key','uq_vivito_backup_snapshot','uq_vivito_governance_scope'
    )
  `;
  const indexSet = new Set(indexes.map((r) => r.indexname));
  for (const idx of ['uq_vivito_event_workspace_idempotency','uq_vivito_checkpoint_run_key','uq_vivito_backup_snapshot','uq_vivito_governance_scope']) {
    if (!indexSet.has(idx)) throw new Error(`Production readback failed: missing index ${idx}`);
  }
  console.log('Production DB schema/RLS/readback: PASS');
}

try {
  await preflight();
  if (mode === 'APPLY') await applyMigrations();
  else console.log('CHECK mode: no schema or data changes were executed.');
  await readback();
  console.log(`VIVITO Production DB Gate: PASS (${mode})`);
} finally {
  await sql.end({ timeout: 5 });
}
