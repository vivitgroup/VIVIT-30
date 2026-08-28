BEGIN;

CREATE TABLE IF NOT EXISTS vivito_memory_nodes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  kind text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  confidence real NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_type text NOT NULL,
  source_id text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  fresh_until timestamptz,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','STALE','SUPERSEDED','DISPUTED')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_memory_scope ON vivito_memory_nodes(workspace_id, client_id, status);
CREATE INDEX IF NOT EXISTS idx_vivito_memory_freshness ON vivito_memory_nodes(workspace_id, fresh_until);

CREATE TABLE IF NOT EXISTS vivito_memory_edges (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  from_node_id text NOT NULL REFERENCES vivito_memory_nodes(id) ON DELETE CASCADE,
  to_node_id text NOT NULL REFERENCES vivito_memory_nodes(id) ON DELETE CASCADE,
  relation text NOT NULL,
  evidence text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_node_id <> to_node_id)
);
CREATE INDEX IF NOT EXISTS idx_vivito_memory_edges_scope ON vivito_memory_edges(workspace_id, client_id, relation);

CREATE TABLE IF NOT EXISTS vivito_commitments (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  title text NOT NULL,
  owner_id text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','BLOCKED','DONE','CANCELLED')),
  evidence text,
  completed_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_commitments_queue ON vivito_commitments(workspace_id, client_id, status, due_at);

CREATE TABLE IF NOT EXISTS vivito_strategic_objectives (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  parent_id text REFERENCES vivito_strategic_objectives(id) ON DELETE SET NULL,
  title text NOT NULL,
  level text NOT NULL CHECK (level IN ('COMPANY','DEPARTMENT','TEAM','INITIATIVE')),
  metric text,
  target real,
  owner_id text NOT NULL,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','AT_RISK','ACHIEVED','CANCELLED')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_objectives_scope ON vivito_strategic_objectives(workspace_id, client_id, status);

CREATE TABLE IF NOT EXISTS vivito_decisions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  title text NOT NULL,
  decision text NOT NULL,
  rationale text NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outcome text,
  owner_id text NOT NULL,
  review_at timestamptz,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','REJECTED','REVERSED','CLOSED')),
  actual_outcome text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_decisions_review ON vivito_decisions(workspace_id, client_id, status, review_at);

CREATE TABLE IF NOT EXISTS vivito_outcomes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  decision_id text REFERENCES vivito_decisions(id) ON DELETE SET NULL,
  metric text NOT NULL,
  baseline real,
  target real,
  actual real,
  attribution_confidence real NOT NULL DEFAULT 0 CHECK (attribution_confidence >= 0 AND attribution_confidence <= 1),
  evidence text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_outcomes_scope ON vivito_outcomes(workspace_id, client_id, decision_id, observed_at);

CREATE TABLE IF NOT EXISTS vivito_scenarios (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  title text NOT NULL,
  scenario_type text NOT NULL CHECK (scenario_type IN ('BASE','UPSIDE','DOWNSIDE','STRESS','CUSTOM')),
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  probability real CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1)),
  status text NOT NULL DEFAULT 'HYPOTHESIS' CHECK (status IN ('HYPOTHESIS','VALIDATED','RETIRED')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_scenarios_scope ON vivito_scenarios(workspace_id, client_id, status);

CREATE TABLE IF NOT EXISTS vivito_proof_ledger (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  claimed_outcome text NOT NULL,
  evidence_type text NOT NULL,
  evidence_ref text NOT NULL,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','VERIFIED','FAILED','PARTIAL')),
  verified_at timestamptz,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_proof_scope ON vivito_proof_ledger(workspace_id, client_id, verification_status, created_at);

CREATE TABLE IF NOT EXISTS vivito_dependency_edges (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  from_type text NOT NULL,
  from_id text NOT NULL,
  to_type text NOT NULL,
  to_id text NOT NULL,
  dependency_type text NOT NULL,
  criticality text NOT NULL DEFAULT 'MEDIUM' CHECK (criticality IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vivito_dependency_scope ON vivito_dependency_edges(workspace_id, client_id, is_active, criticality);

COMMIT;
